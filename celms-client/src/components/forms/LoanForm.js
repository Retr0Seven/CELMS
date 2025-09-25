import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import api from '../../services/api';
import moment from 'moment';

const LoanForm = ({ onSubmitSuccess }) => {
  const [items, setItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState('');

  // Load data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);
        const [itemsRes, usersRes, reservationsRes] = await Promise.all([
          api.get('/items?status=available'),
          api.get('/users'),
          api.get('/reservations?status=approved')
        ]);

        setItems(itemsRes.data);
        setUsers(usersRes.data);
        setReservations(reservationsRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, []);

  // Filter reservations by selected user
  const userReservations = reservations.filter(
    res => res.user_id === selectedUserId
  );

  // Form validation schema
  const validationSchema = Yup.object({
    item_id: Yup.number()
      .required('Item is required'),
    user_id: Yup.string()
      .required('User is required'),
    reservation_id: Yup.number(),
    due_at: Yup.date()
      .required('Due date is required')
      .min(moment().format('YYYY-MM-DD'), 'Due date must be today or later')
  });

  // Initialize form
  const formik = useFormik({
    initialValues: {
      item_id: '',
      user_id: '',
      reservation_id: '',
      due_at: moment().add(7, 'days').format('YYYY-MM-DD')
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        setLoading(true);

        // Convert to proper format for API
        const loanData = {
          ...values,
          due_at: moment(values.due_at).toISOString(),
          reservation_id: values.reservation_id || null
        };

        await api.post('/loans', loanData);
        toast.success('Loan created successfully');

        if (onSubmitSuccess) {
          onSubmitSuccess();
        }

        formik.resetForm();
      } catch (error) {
        console.error('Error creating loan:', error);
        toast.error(error.response?.data?.message || 'Failed to create loan');
      } finally {
        setLoading(false);
      }
    }
  });

  // Handle user selection change
  const handleUserChange = (event) => {
    const userId = event.target.value;
    setSelectedUserId(userId);
    formik.setFieldValue('user_id', userId);

    // Reset reservation selection when user changes
    formik.setFieldValue('reservation_id', '');

    // If user has approved reservations, select the first one's item
    const userRes = reservations.filter(res => res.user_id === userId);
    if (userRes.length > 0) {
      formik.setFieldValue('item_id', userRes[0].item_id);
    }
  };

  // Handle reservation selection change
  const handleReservationChange = (event) => {
    const reservationId = event.target.value;
    formik.setFieldValue('reservation_id', reservationId);

    // Update item_id if reservation is selected
    if (reservationId) {
      const selectedReservation = reservations.find(res => res.reservation_id.toString() === reservationId);
      if (selectedReservation) {
        formik.setFieldValue('item_id', selectedReservation.item_id);
      }
    }
  };

  return (
    <form onSubmit={formik.handleSubmit}>
      <div className="mb-3">
        <label htmlFor="user_id" className="form-label">User</label>
        {loadingData ? (
          <div className="d-flex align-items-center mb-2">
            <div className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></div>
            <span>Loading users...</span>
          </div>
        ) : (
          <select
            id="user_id"
            className={`form-select ${formik.touched.user_id && formik.errors.user_id ? 'is-invalid' : ''}`}
            onChange={handleUserChange}
            value={formik.values.user_id}
          >
            <option value="">Select a user</option>
            {users.map(user => (
              <option key={user.user_id} value={user.user_id}>
                {user.first_name} {user.last_name} ({user.role})
              </option>
            ))}
          </select>
        )}
        {formik.touched.user_id && formik.errors.user_id && (
          <div className="invalid-feedback">{formik.errors.user_id}</div>
        )}
      </div>

      <div className="mb-3">
        <label htmlFor="reservation_id" className="form-label">Reservation (optional)</label>
        <select
          id="reservation_id"
          className="form-select"
          onChange={handleReservationChange}
          value={formik.values.reservation_id}
          disabled={!selectedUserId || userReservations.length === 0}
        >
          <option value="">No reservation</option>
          {userReservations.map(res => {
            const startDate = new Date(res.period.slice(1).split(',')[0]);
            const endDate = new Date(res.period.split(',')[1].slice(0, -1));

            return (
              <option key={res.reservation_id} value={res.reservation_id}>
                {moment(startDate).format('MMM D')} - {moment(endDate).format('MMM D, YYYY')} | Item: {res.asset_tag}
              </option>
            );
          })}
        </select>
      </div>

      <div className="mb-3">
        <label htmlFor="item_id" className="form-label">Equipment Item</label>
        {loadingData ? (
          <div className="d-flex align-items-center mb-2">
            <div className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></div>
            <span>Loading items...</span>
          </div>
        ) : (
          <select
            id="item_id"
            className={`form-select ${formik.touched.item_id && formik.errors.item_id ? 'is-invalid' : ''}`}
            {...formik.getFieldProps('item_id')}
            disabled={!!formik.values.reservation_id}
          >
            <option value="">Select an item</option>
            {items.map(item => (
              <option key={item.item_id} value={item.item_id}>
                {item.asset_tag} - {item.model} ({item.category})
              </option>
            ))}
          </select>
        )}
        {formik.touched.item_id && formik.errors.item_id && (
          <div className="invalid-feedback">{formik.errors.item_id}</div>
        )}
      </div>

      <div className="mb-3">
        <label htmlFor="due_at" className="form-label">Due Date</label>
        <input
          id="due_at"
          type="date"
          className={`form-control ${formik.touched.due_at && formik.errors.due_at ? 'is-invalid' : ''}`}
          {...formik.getFieldProps('due_at')}
        />
        {formik.touched.due_at && formik.errors.due_at && (
          <div className="invalid-feedback">{formik.errors.due_at}</div>
        )}
      </div>

      <div className="d-grid">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || loadingData}
        >
          {loading ? (
            <span>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Creating Loan...
            </span>
          ) : 'Create Loan'}
        </button>
      </div>
    </form>
  );
};

export default LoanForm;