-- ===========================
-- CELMS PL/pgSQL Functions and Seed Data
-- ===========================
-- This file contains all stored procedures, triggers, and seed data for the
-- Campus Equipment Loan Management System (CELMS)
-- 
-- Last updated: 2025-09-24
-- ===========================

-- ===== PART 1: PL/PGSQL FUNCTIONS =====

-- Utility: audit helper
CREATE OR REPLACE FUNCTION fn_audit(_actor UUID, _entity TEXT, _entity_id TEXT, _action TEXT, _details JSONB DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  INSERT INTO audit_events(actor_user_id, entity, entity_id, action, details)
  VALUES (_actor, _entity, _entity_id, _action, _details);
END;
$$ LANGUAGE plpgsql;

-- Enforce technician role when inserting into technicians
CREATE OR REPLACE FUNCTION trg_technician_role_enforce()
RETURNS TRIGGER AS $$
DECLARE v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM users WHERE user_id = NEW.technician_id;
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'User % not found', NEW.technician_id USING ERRCODE = 'foreign_key_violation';
  END IF;
  IF v_role <> 'technician' THEN
    RAISE EXCEPTION 'User % must have role=technician to be in technicians', NEW.technician_id USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_technician_role_enforce ON technicians;
CREATE TRIGGER trg_technician_role_enforce
BEFORE INSERT OR UPDATE ON technicians
FOR EACH ROW EXECUTE FUNCTION trg_technician_role_enforce();

-- Penalty computation
CREATE OR REPLACE FUNCTION fn_compute_penalty_amount(_due_at TIMESTAMPTZ, _return_at TIMESTAMPTZ)
RETURNS NUMERIC AS $$
DECLARE
  per_day NUMERIC;
  days_late INT;
BEGIN
  SELECT value INTO per_day FROM celms_settings WHERE key='penalty_per_day_mad';
  IF _return_at <= _due_at THEN
    RETURN 0;
  END IF;
  days_late := CEIL(EXTRACT(EPOCH FROM (_return_at - _due_at))/86400.0);
  RETURN GREATEST(0, days_late) * COALESCE(per_day, 10);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Notification creation function
CREATE OR REPLACE FUNCTION fn_create_notification(_user_id UUID, _type TEXT, _payload JSONB)
RETURNS BIGINT AS $$
DECLARE notif_id BIGINT;
BEGIN
  INSERT INTO notifications(user_id, type, payload)
  VALUES (_user_id, _type, _payload)
  RETURNING notif_id INTO notif_id;
  RETURN notif_id;
END;
$$ LANGUAGE plpgsql;

-- Mark notification as read
CREATE OR REPLACE FUNCTION fn_mark_notification_read(_user_id UUID, _notif_id BIGINT)
RETURNS VOID AS $$
BEGIN
  UPDATE notifications
  SET read_at = now()
  WHERE user_id = _user_id AND notif_id = _notif_id AND read_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- User management: activate/deactivate
CREATE OR REPLACE FUNCTION fn_toggle_user_status(_admin_id UUID, _user_id UUID, _active BOOLEAN)
RETURNS VOID AS $$
BEGIN
  UPDATE users SET is_active = _active WHERE user_id = _user_id;
  PERFORM fn_audit(_admin_id, 'user', _user_id::TEXT, 
                  CASE WHEN _active THEN 'activate' ELSE 'deactivate' END, NULL);
END;
$$ LANGUAGE plpgsql;

-- Request reservation (pending)
CREATE OR REPLACE FUNCTION fn_request_reservation(_actor UUID, _item BIGINT, _start TIMESTAMPTZ, _end TIMESTAMPTZ)
RETURNS BIGINT AS $$
DECLARE rid BIGINT;
BEGIN
  IF _start >= _end THEN
    RAISE EXCEPTION 'Start must be before end';
  END IF;

  INSERT INTO reservations(item_id, user_id, period, status)
  VALUES (_item, _actor, tstzrange(_start, _end, '[)'), 'pending')
  RETURNING reservation_id INTO rid;

  PERFORM fn_audit(_actor, 'reservation', rid::TEXT, 'request', jsonb_build_object('start', _start, 'end', _end));
  
  -- Create notification for the user
  PERFORM fn_create_notification(_actor, 'reservation', jsonb_build_object(
    'message', 'Reservation request submitted successfully',
    'reservation_id', rid,
    'item_id', _item,
    'period', jsonb_build_object('start', _start, 'end', _end),
    'status', 'pending'
  ));
  
  RETURN rid;
END;
$$ LANGUAGE plpgsql;

-- Approve reservation (admin/tech)
CREATE OR REPLACE FUNCTION fn_approve_reservation(_approver UUID, _reservation_id BIGINT, _reason TEXT DEFAULT NULL)
RETURNS VOID AS $$
DECLARE 
  r RECORD;
  user_id UUID;
  item_tag TEXT;
BEGIN
  SELECT res.*, i.asset_tag 
  INTO r 
  FROM reservations res
  JOIN equipment_items i ON res.item_id = i.item_id
  WHERE reservation_id = _reservation_id 
  FOR UPDATE;
  
  IF NOT FOUND THEN RAISE EXCEPTION 'Reservation % not found', _reservation_id; END IF;
  IF r.status NOT IN ('pending','approved','confirmed') THEN
    RAISE EXCEPTION 'Reservation % cannot be approved from status %', _reservation_id, r.status;
  END IF;
  -- Ensure no overlap against other approved/confirmed reservations for same item
  IF EXISTS (
    SELECT 1 FROM reservations x
    WHERE x.item_id = r.item_id
      AND x.reservation_id <> r.reservation_id
      AND x.status IN ('approved','confirmed')
      AND x.period && r.period
  ) THEN
    RAISE EXCEPTION 'Overlap with existing reservation on this item';
  END IF;

  UPDATE reservations
    SET status='approved', decided_by=_approver, decision_reason=_reason
    WHERE reservation_id = _reservation_id
    RETURNING user_id INTO user_id;

  PERFORM fn_audit(_approver, 'reservation', _reservation_id::TEXT, 'approve', to_jsonb(r));
  
  -- Create notification for the requestor
  PERFORM fn_create_notification(user_id, 'reservation', jsonb_build_object(
    'message', 'Your reservation for ' || r.asset_tag || ' has been approved',
    'reservation_id', _reservation_id,
    'asset_tag', r.asset_tag,
    'period', jsonb_build_object('start', lower(r.period), 'end', upper(r.period))
  ));
END;
$$ LANGUAGE plpgsql;

-- Deny reservation
CREATE OR REPLACE FUNCTION fn_deny_reservation(_approver UUID, _reservation_id BIGINT, _reason TEXT)
RETURNS VOID AS $$
DECLARE r RECORD; user_id UUID; item_tag TEXT;
BEGIN
  SELECT res.*, i.asset_tag 
  INTO r 
  FROM reservations res
  JOIN equipment_items i ON res.item_id = i.item_id
  WHERE reservation_id = _reservation_id;
  
  IF NOT FOUND THEN RAISE EXCEPTION 'Reservation not found'; END IF;
  
  UPDATE reservations
    SET status='denied', decided_by=_approver, decision_reason=_reason
    WHERE reservation_id = _reservation_id
    RETURNING user_id INTO user_id;
    
  PERFORM fn_audit(_approver, 'reservation', _reservation_id::TEXT, 'deny', jsonb_build_object('reason', _reason));
  
  -- Create notification for the requestor
  PERFORM fn_create_notification(user_id, 'reservation', jsonb_build_object(
    'message', 'Your reservation for ' || r.asset_tag || ' was denied: ' || _reason,
    'reservation_id', _reservation_id,
    'asset_tag', r.asset_tag,
    'reason', _reason
  ));
END;
$$ LANGUAGE plpgsql;

-- Cancel reservation (owner)
CREATE OR REPLACE FUNCTION fn_cancel_reservation(_actor UUID, _reservation_id BIGINT)
RETURNS VOID AS $$
DECLARE r RECORD;
BEGIN
  SELECT * INTO r FROM reservations WHERE reservation_id=_reservation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reservation not found'; END IF;
  IF r.user_id <> _actor THEN RAISE EXCEPTION 'Only owner can cancel'; END IF;
  IF lower(r.period) <= now() THEN RAISE EXCEPTION 'Cannot cancel after start'; END IF;
  UPDATE reservations SET status='cancelled' WHERE reservation_id=_reservation_id;
  PERFORM fn_audit(_actor, 'reservation', _reservation_id::TEXT, 'cancel', NULL);
END;
$$ LANGUAGE plpgsql;

-- Check if reservation period is available
CREATE OR REPLACE FUNCTION fn_is_period_available(_item_id BIGINT, _start TIMESTAMPTZ, _end TIMESTAMPTZ, _exclude_reservation_id BIGINT DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM reservations 
    WHERE item_id = _item_id
      AND (_exclude_reservation_id IS NULL OR reservation_id != _exclude_reservation_id)
      AND status IN ('approved', 'confirmed')
      AND period && tstzrange(_start, _end, '[)')
  );
END;
$$ LANGUAGE plpgsql;

-- Checkout from reservation
CREATE OR REPLACE FUNCTION fn_checkout_from_reservation(_actor UUID, _reservation_id BIGINT)
RETURNS BIGINT AS $$
DECLARE r RECORD; loan_id BIGINT; due TIMESTAMPTZ; nowts TIMESTAMPTZ := now();
BEGIN
  SELECT * INTO r FROM reservations WHERE reservation_id = _reservation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reservation % not found', _reservation_id; END IF;
  IF r.status NOT IN ('approved','confirmed') THEN
    RAISE EXCEPTION 'Reservation % not approved/confirmed', _reservation_id;
  END IF;

  -- Ensure item available: status and no active loan
  IF EXISTS (SELECT 1 FROM loans l WHERE l.item_id=r.item_id AND l.return_at IS NULL) THEN
    RAISE EXCEPTION 'Item is currently checked out';
  END IF;

  PERFORM 1 FROM equipment_items i WHERE i.item_id=r.item_id AND i.status='available' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item not available'; END IF;

  -- Compute due date
  SELECT nowts + make_interval(days => COALESCE((SELECT value::INT FROM celms_settings WHERE key='default_loan_days'),7))
    INTO due;

  INSERT INTO loans(item_id, user_id, reservation_id, checkout_at, due_at)
  VALUES (r.item_id, r.user_id, r.reservation_id, nowts, due)
  RETURNING loan_id INTO loan_id;

  -- Mark reservation confirmed
  UPDATE reservations SET status='confirmed' WHERE reservation_id=_reservation_id;
  -- Mark item checked_out
  UPDATE equipment_items SET status='checked_out' WHERE item_id=r.item_id;

  PERFORM fn_audit(_actor, 'loan', loan_id::TEXT, 'checkout_from_reservation', to_jsonb(r));
  
  -- Create notification for the user
  PERFORM fn_create_notification(r.user_id, 'loan', jsonb_build_object(
    'message', 'Your item has been checked out from reservation',
    'loan_id', loan_id,
    'reservation_id', _reservation_id,
    'due_date', due
  ));
  
  RETURN loan_id;
END;
$$ LANGUAGE plpgsql;

-- Ad-hoc checkout (no reservation)
CREATE OR REPLACE FUNCTION fn_checkout_adhoc(_actor UUID, _user UUID, _item BIGINT)
RETURNS BIGINT AS $$
DECLARE 
  loan_id BIGINT; 
  due TIMESTAMPTZ; 
  nowts TIMESTAMPTZ := now();
  item_tag TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM loans l WHERE l.item_id=_item AND l.return_at IS NULL) THEN
    RAISE EXCEPTION 'Item is currently checked out';
  END IF;

  SELECT asset_tag INTO item_tag FROM equipment_items 
  WHERE item_id=_item AND status='available' 
  FOR UPDATE;
  
  IF NOT FOUND THEN RAISE EXCEPTION 'Item not available'; END IF;

  SELECT nowts + make_interval(days => COALESCE((SELECT value::INT FROM celms_settings WHERE key='default_loan_days'),7))
    INTO due;

  INSERT INTO loans(item_id, user_id, checkout_at, due_at)
  VALUES (_item, _user, nowts, due)
  RETURNING loan_id INTO loan_id;

  UPDATE equipment_items SET status='checked_out' WHERE item_id=_item;

  PERFORM fn_audit(_actor, 'loan', loan_id::TEXT, 'checkout_adhoc', NULL);
  
  -- Create notification for the borrower
  PERFORM fn_create_notification(_user, 'loan', jsonb_build_object(
    'message', 'You have checked out: ' || item_tag,
    'loan_id', loan_id,
    'due_date', due,
    'asset_tag', item_tag
  ));
  
  RETURN loan_id;
END;
$$ LANGUAGE plpgsql;

-- Return loan (compute penalty; optional damaged ticket)
CREATE OR REPLACE FUNCTION fn_return_loan(_actor UUID, _loan_id BIGINT, _damaged BOOLEAN DEFAULT FALSE, _condition TEXT DEFAULT NULL)
RETURNS VOID AS $$
DECLARE 
  l RECORD; 
  amount NUMERIC;
  item_tag TEXT;
BEGIN
  SELECT l.*, i.asset_tag INTO l FROM loans l
  JOIN equipment_items i ON l.item_id = i.item_id
  WHERE loan_id=_loan_id FOR UPDATE;
  
  IF NOT FOUND THEN RAISE EXCEPTION 'Loan % not found', _loan_id; END IF;
  IF l.return_at IS NOT NULL THEN RAISE EXCEPTION 'Loan already returned'; END IF;

  UPDATE loans
    SET return_at = now(), damaged = COALESCE(_damaged,false), return_condition = _condition
    WHERE loan_id=_loan_id;

  -- Mark item available if not damaged; else out_of_service
  IF COALESCE(_damaged,false) THEN
    UPDATE equipment_items SET status='out_of_service' WHERE item_id=l.item_id;
  ELSE
    UPDATE equipment_items SET status='available' WHERE item_id=l.item_id;
  END IF;

  -- Penalty if overdue
  amount := fn_compute_penalty_amount(l.due_at, now());
  IF amount > 0 THEN
    INSERT INTO penalties(loan_id, user_id, amount_mad, reason)
    VALUES (_loan_id, l.user_id, amount, 'overdue');
    
    -- Create notification for penalty
    PERFORM fn_create_notification(l.user_id, 'penalty', jsonb_build_object(
      'message', 'You have a penalty of ' || amount || ' MAD for late return',
      'loan_id', _loan_id,
      'amount', amount,
      'item', l.asset_tag
    ));
  END IF;

  -- Auto maintenance ticket if damaged
  IF COALESCE(_damaged,false) = true THEN
    INSERT INTO maintenance_tickets(item_id, loan_id, opened_by, severity, status, description)
    VALUES (l.item_id, l.loan_id, _actor, 'medium', 'open', COALESCE(_condition,'Damaged on return'));
  END IF;

  PERFORM fn_audit(_actor, 'loan', _loan_id::TEXT, 'return', jsonb_build_object('damaged', _damaged, 'condition', _condition, 'penalty', amount));
  
  -- Create return notification
  PERFORM fn_create_notification(l.user_id, 'return', jsonb_build_object(
    'message', 'Thank you for returning ' || l.asset_tag,
    'loan_id', _loan_id,
    'return_date', now()
  ));
END;
$$ LANGUAGE plpgsql;

-- Expire old reservations utility
CREATE OR REPLACE FUNCTION fn_expire_old_reservations()
RETURNS INT AS $$
DECLARE 
  n INT;
  expired_reservations CURSOR FOR 
    SELECT reservation_id, user_id, i.asset_tag
    FROM reservations r
    JOIN equipment_items i ON r.item_id = i.item_id
    WHERE r.status IN ('pending','approved')
      AND upper(r.period) < now();
  rec RECORD;
BEGIN
  -- Update status to expired
  UPDATE reservations
    SET status='expired'
  WHERE status IN ('pending','approved')
    AND upper(period) < now();
  GET DIAGNOSTICS n = ROW_COUNT;
  
  -- Send notifications for each expired reservation
  FOR rec IN expired_reservations LOOP
    PERFORM fn_create_notification(rec.user_id, 'reservation', jsonb_build_object(
      'message', 'Your reservation for ' || rec.asset_tag || ' has expired',
      'reservation_id', rec.reservation_id,
      'asset_tag', rec.asset_tag
    ));
  END LOOP;
  
  RETURN n;
END;
$$ LANGUAGE plpgsql;

-- Item update helper
CREATE OR REPLACE FUNCTION fn_item_update(_actor UUID, _item BIGINT, _status TEXT, _location TEXT, _last_serviced DATE)
RETURNS VOID AS $$
BEGIN
  UPDATE equipment_items
     SET status=_status, location=_location, last_serviced=_last_serviced
   WHERE item_id=_item;
  PERFORM fn_audit(_actor, 'item', _item::TEXT, 'update', NULL);
END;
$$ LANGUAGE plpgsql;

-- Update user login timestamp
CREATE OR REPLACE FUNCTION fn_update_login_timestamp(_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE users SET last_login = now() WHERE user_id = _user_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger: auto-ticket on damaged return via DML
CREATE OR REPLACE FUNCTION trg_loans_after_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.return_at IS NOT NULL AND NEW.damaged = true AND (OLD.return_at IS NULL OR OLD.damaged IS DISTINCT FROM NEW.damaged) THEN
    -- Ensure a ticket exists
    INSERT INTO maintenance_tickets(item_id, loan_id, opened_by, severity, status, description)
    VALUES (NEW.item_id, NEW.loan_id, NEW.user_id, 'medium', 'open', COALESCE(NEW.return_condition,'Damaged on return'))
    ON CONFLICT DO NOTHING;
    UPDATE equipment_items SET status='out_of_service' WHERE item_id=NEW.item_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_loans_after_update ON loans;
CREATE TRIGGER trg_loans_after_update
AFTER UPDATE ON loans
FOR EACH ROW EXECUTE FUNCTION trg_loans_after_update();

-- ===== PART 2: SEED DATA =====

-- =============================
-- Users with various roles
-- =============================
INSERT INTO users (role, first_name, last_name, email, phone, password, profile_image, is_active, last_login) VALUES
 ('admin','Alice','Admin','alice.admin@uni.local','+212600000001', 'Admin123!', 'https://randomuser.me/api/portraits/women/22.jpg', TRUE, now() - interval '2 days'),
 ('technician','Tariq','Tech','tariq.tech@uni.local','+212600000002', 'Admin123!', 'https://randomuser.me/api/portraits/men/35.jpg', TRUE, now() - interval '5 hours'),
 ('staff','Samira','Staff','samira.staff@uni.local','+212600000003', 'User123!', 'https://randomuser.me/api/portraits/women/68.jpg', TRUE, now() - interval '1 day'),
 ('student','Youssef','Student','youssef.student@uni.local','+212600000004', 'User123!', 'https://randomuser.me/api/portraits/men/45.jpg', TRUE, now() - interval '3 days'),
 ('student','Meriem','Student','meriem.student@uni.local','+212600000005', 'User123!', 'https://randomuser.me/api/portraits/women/32.jpg', TRUE, now() - interval '12 hours'),
 ('technician','Omar','Support','omar.support@uni.local','+212600000006', 'Admin123!', 'https://randomuser.me/api/portraits/men/55.jpg', TRUE, now() - interval '4 days'),
 ('staff','Fatima','Professor','fatima.professor@uni.local','+212600000007', 'User123!', 'https://randomuser.me/api/portraits/women/41.jpg', TRUE, now() - interval '6 hours'),
 ('student','Hassan','Researcher','hassan.researcher@uni.local','+212600000008', 'User123!', 'https://randomuser.me/api/portraits/men/22.jpg', TRUE, now() - interval '5 days'),
 ('student','Layla','Graduate','layla.graduate@uni.local','+212600000009', 'User123!', 'https://randomuser.me/api/portraits/women/57.jpg', TRUE, now() - interval '2 hours'),
 ('student','Karim','Inactive','karim.inactive@uni.local','+212600000010', 'User123!', NULL, FALSE, now() - interval '60 days');

-- Promote technicians
INSERT INTO technicians(technician_id, specialization, notes)
SELECT user_id, 'Electronics', 'Camera & projector maintenance'
FROM users WHERE email='tariq.tech@uni.local';

INSERT INTO technicians(technician_id, specialization, notes)
SELECT user_id, 'IT Support', 'Computer hardware and software'
FROM users WHERE email='omar.support@uni.local';

-- =============================
-- Equipment Categories & Models
-- =============================
INSERT INTO equipment_categories(name, description) VALUES
 ('Laptops','Portable computers for general use'),
 ('Cameras','DSLR/Mirrorless cameras for photography and video'),
 ('Projectors','Conference and classroom projectors'),
 ('Lab Kits','Electronics and experimental kits'),
 ('Audio Equipment', 'Microphones, recorders, and sound equipment'),
 ('VR Equipment', 'Virtual reality headsets and accessories'),
 ('Photography Tools', 'Tripods, lighting, and camera accessories'),
 ('Computing Accessories', 'Mice, keyboards, adapters, and dongles');

INSERT INTO equipment_models(category_id, brand, model_name, spec_json) VALUES
 ((SELECT category_id FROM equipment_categories WHERE name='Laptops'),'Dell','Latitude 7420',
  '{"cpu":"Intel Core i7-1185G7","ram":"16GB","storage":"512GB SSD","display":"14-inch FHD","os":"Windows 11 Pro","ports":["USB-C","HDMI","USB-A"],"battery":"53Whr"}'),
 
 ((SELECT category_id FROM equipment_categories WHERE name='Laptops'),'Lenovo','ThinkPad T14',
  '{"cpu":"Intel Core i5-1135G7","ram":"16GB","storage":"256GB SSD","display":"14-inch FHD","os":"Windows 11 Pro","ports":["USB-C","HDMI","USB-A"],"battery":"50Whr"}'),
 
 ((SELECT category_id FROM equipment_categories WHERE name='Laptops'),'Apple','MacBook Pro 14"',
  '{"cpu":"M1 Pro","ram":"16GB","storage":"512GB","display":"14.2-inch Liquid Retina XDR","os":"macOS Sonoma","ports":["USB-C","HDMI","SD Card"],"battery":"70Whr"}'),
 
 ((SELECT category_id FROM equipment_categories WHERE name='Cameras'),'Canon','EOS M50',
  '{"sensor":"APS-C","megapixels":24.1,"videoRes":"4K","mount":"EF-M","type":"Mirrorless","weight":"390g","battery":"LP-E12"}'),
 
 ((SELECT category_id FROM equipment_categories WHERE name='Cameras'),'Sony','Alpha a7 III',
  '{"sensor":"Full Frame","megapixels":24.2,"videoRes":"4K","mount":"E-mount","type":"Mirrorless","weight":"650g","battery":"NP-FZ100"}'),
 
 ((SELECT category_id FROM equipment_categories WHERE name='Projectors'),'Epson','EB-X41',
  '{"lumens":3600,"resolution":"XGA (1024x768)","contrast":"15000:1","throw":"1.48-1.77:1","lamp":"210W UHE","connections":["HDMI","VGA","USB"]}'),
 
 ((SELECT category_id FROM equipment_categories WHERE name='Projectors'),'BenQ','MW560',
  '{"lumens":4000,"resolution":"WXGA (1280x800)","contrast":"20000:1","throw":"1.55-1.86:1","lamp":"203W","connections":["HDMI","VGA","USB-A"]}'),
 
 ((SELECT category_id FROM equipment_categories WHERE name='Lab Kits'),'Arduino','Starter Kit',
  '{"components":["Arduino UNO","Breadboard","LED","Resistors","Wires"],"documentation":"Included","suitable_for":"Beginners","projects":15}'),
 
 ((SELECT category_id FROM equipment_categories WHERE name='Audio Equipment'),'Rode','VideoMic Pro',
  '{"type":"shotgun","pattern":"supercardioid","battery":"9V","frequency_response":"40Hz-20kHz","weight":"85g","connection":"3.5mm TRS"}'),
 
 ((SELECT category_id FROM equipment_categories WHERE name='VR Equipment'),'Oculus','Quest 2',
  '{"resolution":"1832x1920 per eye","storage":"128GB","processor":"Snapdragon XR2","ram":"6GB","battery":"2-3 hours","tracking":"Inside-out"}'),
 
 ((SELECT category_id FROM equipment_categories WHERE name='Photography Tools'),'Manfrotto','MK190XPRO3',
  '{"max_height":"170cm","material":"aluminum","sections":3,"weight":"2kg","max_load":"6kg","folded_length":"59cm"}'),
 
 ((SELECT category_id FROM equipment_categories WHERE name='Computing Accessories'),'Logitech','MX Master 3',
  '{"connection":["Bluetooth","USB-C"],"buttons":7,"dpi":4000,"battery":"70 days","weight":"141g","scroll_wheel":"MagSpeed"}');

-- =============================
-- Equipment Items
-- =============================
INSERT INTO equipment_items(model_id, asset_tag, status, location, purchase_date, last_serviced, image_url) VALUES
 ((SELECT model_id FROM equipment_models WHERE brand='Dell' AND model_name='Latitude 7420'),'LAP-001','available','LIB-Desk', '2023-01-10', '2024-06-15', 'https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/notebooks/latitude-notebooks/14-7420/media-gallery/peripherals_laptop_latitude_7420_gallery_1.psd?fmt=pjpg&pscan=auto&scl=1&wid=3635&hei=2548&qlt=100,0&resMode=sharp2&size=3635,2548'),
 
 ((SELECT model_id FROM equipment_models WHERE brand='Dell' AND model_name='Latitude 7420'),'LAP-002','available','LIB-Desk', '2023-01-10', '2024-06-15', 'https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/notebooks/latitude-notebooks/14-7420/media-gallery/peripherals_laptop_latitude_7420_gallery_1.psd?fmt=pjpg&pscan=auto&scl=1&wid=3635&hei=2548&qlt=100,0&resMode=sharp2&size=3635,2548'),
 
 ((SELECT model_id FROM equipment_models WHERE brand='Lenovo' AND model_name='ThinkPad T14'),'LAP-101','available','ITS-Storage','2024-02-05', '2024-07-22', 'https://p1-ofp.static.pub/fes/cms/2022/04/26/2xkgqrr5msjwo6cj4ov9twmgdw9l2h220057.png'),
 
 ((SELECT model_id FROM equipment_models WHERE brand='Apple' AND model_name='MacBook Pro 14"'),'LAP-MAC-001','available','LIB-Desk','2024-01-05', '2024-08-10', 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/mbp14-spacegray-select-202301?wid=904&hei=840&fmt=jpeg&qlt=90&.v=1671304673229'),
 
 ((SELECT model_id FROM equipment_models WHERE brand='Canon' AND model_name='EOS M50'),'CAM-010','available','Media-Lab','2022-09-21', '2024-03-15', 'https://media.canon-europe.com/assets/images/EOS%20M50%20BLACK%20BODY%20FSL.jpg'),
 
 ((SELECT model_id FROM equipment_models WHERE brand='Sony' AND model_name='Alpha a7 III'),'CAM-020','available','Media-Lab','2023-05-17', '2024-05-30', 'https://d1ge0kk1l5kms0.cloudfront.net/images/G/01/appcore/camera/Sony/2021/3000b/01-B07B43WPVK-1.jpg'),
 
 ((SELECT model_id FROM equipment_models WHERE brand='Epson' AND model_name='EB-X41'),'PROJ-001','available','Auditorium','2021-10-01', '2024-01-20', 'https://www.projectorcentral.com/Epson-EB-X41.htm'),
 
 ((SELECT model_id FROM equipment_models WHERE brand='BenQ' AND model_name='MW560'),'PROJ-002','out_of_service','Classroom-103','2022-11-12', '2023-12-05', 'https://www.benq.com/en-us/business/projector/mw560/_jcr_content/root/productinfotabparsys/productspecificatio/image.img.png'),
 
 ((SELECT model_id FROM equipment_models WHERE brand='Arduino' AND model_name='Starter Kit'),'KIT-001','available','ENG-Lab','2024-03-10', NULL, 'https://store-cdn.arduino.cc/uni/catalog/product/cache/1/image/1000x750/f8876a31b63532bbba4e781c30024a0a/k/0/k000007_iso_1.jpg'),
 
 ((SELECT model_id FROM equipment_models WHERE brand='Rode' AND model_name='VideoMic Pro'),'MIC-001','available','Media-Lab', '2024-03-15', '2024-07-01', 'https://edge.rode.com/images/page/1/modules/314/VideoMic_Pro_PL_02.jpg'),
 
 ((SELECT model_id FROM equipment_models WHERE brand='Oculus' AND model_name='Quest 2'),'VR-001','available','CS-Lab', '2023-11-10', '2024-06-22', 'https://m.media-amazon.com/images/I/615YaAiA-ML._SL1500_.jpg'),
 
 ((SELECT model_id FROM equipment_models WHERE brand='Manfrotto' AND model_name='MK190XPRO3'),'TRIPOD-001','available','Media-Lab', '2023-08-20', '2024-04-15', 'https://www.manfrotto.com/media/wysiwyg/mk190xpro3-3w_01.jpg'),
 
 ((SELECT model_id FROM equipment_models WHERE brand='Logitech' AND model_name='MX Master 3'),'MOUSE-001','available','ITS-Storage', '2024-04-30', NULL, 'https://resource.logitech.com/content/dam/gaming/en/products/mx-master-3/mx-master-3-gallery-1-graphite.png');

-- =============================
-- Basic Reservations
-- =============================

-- Create sample reservations
INSERT INTO reservations(item_id, user_id, period, status, requested_at)
SELECT 
  (SELECT item_id FROM equipment_items WHERE asset_tag='LAP-001'),
  (SELECT user_id FROM users WHERE email='youssef.student@uni.local'),
  tstzrange((now() + interval '1 day'), (now() + interval '8 days'),'[)'), 
  'pending', now() - interval '2 hours';

INSERT INTO reservations(item_id, user_id, period, status, requested_at, decided_by, decision_reason)
SELECT 
  (SELECT item_id FROM equipment_items WHERE asset_tag='CAM-010'),
  (SELECT user_id FROM users WHERE email='meriem.student@uni.local'),
  tstzrange((now() + interval '3 days'), (now() + interval '10 days'),'[)'), 
  'approved', now() - interval '1 day', 
  (SELECT user_id FROM users WHERE email='alice.admin@uni.local'), 
  'Approved for class project';

INSERT INTO reservations(item_id, user_id, period, status, requested_at)
SELECT 
  (SELECT item_id FROM equipment_items WHERE asset_tag='LAP-002'),
  (SELECT user_id FROM users WHERE email='fatima.professor@uni.local'),
  tstzrange((now() + interval '5 days'), (now() + interval '12 days'),'[)'), 
  'pending', now() - interval '4 hours';

INSERT INTO reservations(item_id, user_id, period, status, requested_at, decided_by, decision_reason)
SELECT 
  (SELECT item_id FROM equipment_items WHERE asset_tag='PROJ-001'),
  (SELECT user_id FROM users WHERE email='hassan.researcher@uni.local'),
  tstzrange((now() + interval '7 days'), (now() + interval '9 days'),'[)'), 
  'denied', now() - interval '2 days', 
  (SELECT user_id FROM users WHERE email='alice.admin@uni.local'), 
  'Conflicting events in auditorium';

INSERT INTO reservations(item_id, user_id, period, status, requested_at)
SELECT 
  (SELECT item_id FROM equipment_items WHERE asset_tag='VR-001'),
  (SELECT user_id FROM users WHERE email='layla.graduate@uni.local'),
  tstzrange((now() - interval '5 days'), (now() - interval '2 days'),'[)'), 
  'expired', now() - interval '6 days';

-- =============================
-- Sample Loans
-- =============================

-- Create a basic loan (checked out)
INSERT INTO loans(item_id, user_id, checkout_at, due_at)
SELECT 
  (SELECT item_id FROM equipment_items WHERE asset_tag='TRIPOD-001'),
  (SELECT user_id FROM users WHERE email='hassan.researcher@uni.local'),
  now() - interval '3 days', now() + interval '4 days';

UPDATE equipment_items SET status = 'checked_out' 
WHERE asset_tag = 'TRIPOD-001';

-- Create an overdue loan (still not returned)
INSERT INTO loans(item_id, user_id, checkout_at, due_at)
SELECT 
  (SELECT item_id FROM equipment_items WHERE asset_tag='MIC-001'),
  (SELECT user_id FROM users WHERE email='fatima.professor@uni.local'),
  now() - interval '10 days', now() - interval '3 days';

UPDATE equipment_items SET status = 'checked_out' 
WHERE asset_tag = 'MIC-001';

-- Create a past loan that was returned with damage
DO $$
DECLARE loan_id BIGINT;
BEGIN
  INSERT INTO loans(item_id, user_id, checkout_at, due_at, return_at, damaged, return_condition)
  SELECT 
    (SELECT item_id FROM equipment_items WHERE asset_tag='LAP-002'),
    (SELECT user_id FROM users WHERE email='meriem.student@uni.local'),
    now() - interval '14 days', 
    now() - interval '7 days',
    now() - interval '5 days',
    TRUE,
    'Cracked screen'
  RETURNING loans.loan_id INTO loan_id;
  
  -- Add penalty
  INSERT INTO penalties(loan_id, user_id, amount_mad, reason)
  VALUES (
    loan_id, 
    (SELECT user_id FROM users WHERE email='meriem.student@uni.local'),
    70,
    'overdue'
  );
  
  -- Add maintenance ticket
  INSERT INTO maintenance_tickets(item_id, loan_id, opened_by, assigned_to, severity, status, description)
  VALUES (
    (SELECT item_id FROM equipment_items WHERE asset_tag='LAP-002'),
    loan_id,
    (SELECT user_id FROM users WHERE email='alice.admin@uni.local'),
    (SELECT user_id FROM users WHERE email='tariq.tech@uni.local'),
    'medium',
    'open',
    'Cracked screen'
  );
END$$;

-- =============================
-- Maintenance Tickets
-- =============================

-- Create maintenance tickets with different statuses
INSERT INTO maintenance_tickets(item_id, opened_by, assigned_to, severity, status, description, created_at)
VALUES
  ((SELECT item_id FROM equipment_items WHERE asset_tag='PROJ-002'),
   (SELECT user_id FROM users WHERE email='alice.admin@uni.local'),
   (SELECT user_id FROM users WHERE email='tariq.tech@uni.local'),
   'high', 'in_progress', 'Lamp needs replacement, image is very dim',
   now() - interval '5 days'),
   
  ((SELECT item_id FROM equipment_items WHERE asset_tag='LAP-101'),
   (SELECT user_id FROM users WHERE email='samira.staff@uni.local'),
   (SELECT user_id FROM users WHERE email='omar.support@uni.local'),
   'low', 'open', 'Keyboard has some sticky keys that need cleaning',
   now() - interval '2 days');

-- =============================
-- Notifications
-- =============================

-- Add notification examples for different types
INSERT INTO notifications(user_id, type, payload, created_at, read_at) VALUES
  ((SELECT user_id FROM users WHERE email='youssef.student@uni.local'), 
   'reservation', 
   '{"message":"Your reservation for Dell Latitude 7420 has been approved", "reservation_id": 1, "asset_tag": "LAP-001"}'::jsonb,
   now() - interval '2 days',
   now() - interval '1 day'),
  
  ((SELECT user_id FROM users WHERE email='fatima.professor@uni.local'), 
   'loan', 
   '{"message":"Your item Rode VideoMic Pro is overdue by 3 days", "loan_id": 3, "due_date": "2025-09-20T16:00:00Z", "asset_tag": "MIC-001"}'::jsonb,
   now() - interval '3 days',
   NULL),
  
  ((SELECT user_id FROM users WHERE email='samira.staff@uni.local'), 
   'return', 
   '{"message":"Thank you for returning Canon EOS M50", "loan_id": 1, "return_date": "2025-09-20T14:30:00Z"}'::jsonb,
   now() - interval '3 days',
   now() - interval '3 days'),
  
  ((SELECT user_id FROM users WHERE email='meriem.student@uni.local'), 
   'penalty', 
   '{"message":"You have a penalty of 70 MAD for late return", "loan_id": 2, "amount": 70, "item": "Dell Latitude 7420"}'::jsonb,
   now() - interval '5 days',
   NULL),
  
  ((SELECT user_id FROM users WHERE email='tariq.tech@uni.local'), 
   'maintenance', 
   '{"message":"New maintenance ticket assigned: BenQ MW560 with lamp issue", "ticket_id": 1, "severity": "high"}'::jsonb,
   now() - interval '5 days',
   now() - interval '4 days'),
  
  ((SELECT user_id FROM users WHERE email='omar.support@uni.local'), 
   'maintenance', 
   '{"message":"New maintenance ticket assigned: Lenovo ThinkPad T14 with sticky keyboard", "ticket_id": 2, "severity": "low"}'::jsonb,
   now() - interval '2 days',
   NULL);

-- System notification for all users
INSERT INTO notifications(user_id, type, payload, created_at)
SELECT 
  user_id, 
  'system', 
  '{"message":"Welcome to the new CELMS platform! Please report any issues to the administrator."}'::jsonb,
  now() - interval '7 days'
FROM users;

-- =============================
-- Audit Events
-- =============================

INSERT INTO audit_events(occurred_at, actor_user_id, entity, entity_id, action, details) VALUES
  (now() - interval '30 minutes', 
   (SELECT user_id FROM users WHERE email='alice.admin@uni.local'), 
   'user', 
   (SELECT user_id::text FROM users WHERE email='karim.inactive@uni.local'), 
   'deactivate', 
   '{"reason": "Account inactive for over 60 days"}'::jsonb),
   
  (now() - interval '2 hours', 
   (SELECT user_id FROM users WHERE email='tariq.tech@uni.local'), 
   'item', 
   (SELECT item_id::text FROM equipment_items WHERE asset_tag='PROJ-002'), 
   'status_change', 
   '{"from": "available", "to": "out_of_service", "reason": "Lamp failure"}'::jsonb),
   
  (now() - interval '1 day', 
   (SELECT user_id FROM users WHERE email='alice.admin@uni.local'), 
   'reservation', 
   '2', 
   'approve', 
   '{"item": "CAM-010", "user": "Meriem Student"}'::jsonb),
   
  (now() - interval '3 days', 
   (SELECT user_id FROM users WHERE email='alice.admin@uni.local'), 
   'loan', 
   '3', 
   'create', 
   '{"item": "MIC-001", "borrower": "Fatima Professor", "due_date": "2025-09-20"}'::jsonb);

-- ===========================
-- SETTINGS
-- ===========================

-- Default settings
INSERT INTO celms_settings(key, value) VALUES
    ('default_loan_days', '7'),
    ('penalty_per_day_mad', '10')
ON CONFLICT (key) DO NOTHING;