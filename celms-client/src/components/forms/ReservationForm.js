import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import api from '../../services/api';
import moment from 'moment';

const ReservationForm = ({ onSubmitSuccess }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingItems, setLoadingItems] = useState(true);

  // Load available items
  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoadingItems(true);
        const response = await api.get('/items?status=available');
        setItems(response.data);
      } catch (error) {
        console.error('Error fetching items:', error);
        toast.error('Failed to load available items');
      } finally {
        setLoadingItems(false);
      }
    };

    fetchItems();
  }, []);

  // Form validation schema
  const validationSchema = Yup.object({
    item_id: Yup.number()
      .required('Item is required'),
    period_start: Yup.date()
      .required('Start date is required')
      .min(moment().startOf('day'), 'Start date must be today or later'),
    period_end: Yup.date()
      .required('End date is required')
      .min(
        Yup.ref('period_start'),
        'End date must be after the start date'
      )
  });

  // Initialize form
  const formik = useFormik({
    initialValues: {
      item_id: '',
      period_start: moment().format('YYYY-MM-DD'),
      period_end: moment().add(1, 'day').format('YYYY-MM-DD')
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        setLoading(true);

        // Convert to proper format for API
        const reservationData = {
          ...values,
          period_start: moment(values.period_start).toISOString(),
          period_end: moment(values.period_end).toISOString()
        };

        await api.post('/reservations', reservationData);
        toast.success('Reservation created successfully');

        if (onSubmitSuccess) {
          onSubmitSuccess();
        }

        formik.resetForm();
      } catch (error) {
        console.error('Error creating reservation:', error);
        toast.error(error.response?.data?.message || 'Failed to create reservation');
      } finally {
        setLoading(false);
      }
    }
  });

  return (
    <form onSubmit={formik.handleSubmit}>
      <div className="mb-3">
        <label htmlFor="item_id" className="form-label">Equipment Item</label>
        {loadingItems ? (
          <div className="d-flex align-items-center mb-2">
            <div className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></div>
            <span>Loading items...</span>
          </div>
        ) : (
          <select
            id="item_id"
            className={`form-select ${formik.touched.item_id && formik.errors.item_id ? 'is-invalid' : ''}`}
            {...formik.getFieldProps('item_id')}
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

      <div className="row mb-3">
        <div className="col-md-6">
          <label htmlFor="period_start" className="form-label">Start Date</label>
          <input
            id="period_start"
            type="date"
            className={`form-control ${formik.touched.period_start && formik.errors.period_start ? 'is-invalid' : ''}`}
            {...formik.getFieldProps('period_start')}
          />
          {formik.touched.period_start && formik.errors.period_start && (
            <div className="invalid-feedback">{formik.errors.period_start}</div>
          )}
        </div>

        <div className="col-md-6">
          <label htmlFor="period_end" className="form-label">End Date</label>
          <input
            id="period_end"
            type="date"
            className={`form-control ${formik.touched.period_end && formik.errors.period_end ? 'is-invalid' : ''}`}
            {...formik.getFieldProps('period_end')}
          />
          {formik.touched.period_end && formik.errors.period_end && (
            <div className="invalid-feedback">{formik.errors.period_end}</div>
          )}
        </div>
      </div>

      <div className="d-grid">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || loadingItems}
        >
          {loading ? (
            <span>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Creating Reservation...
            </span>
          ) : 'Create Reservation'}
        </button>
      </div>
    </form>
  );
};

export default ReservationForm;