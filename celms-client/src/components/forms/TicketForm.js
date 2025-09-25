import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { useUser } from '../../contexts/UserContext';

const TicketForm = ({ loan = null, itemId = null, onSubmitSuccess, inline = false }) => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingItems, setLoadingItems] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Determine if we have a fixed item/loan
  const hasFixedItem = !!loan?.item_id || !!itemId;
  const hasFixedLoan = !!loan?.loan_id;

  // Load items
  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoadingItems(true);

        // If we have a fixed item, fetch just that one
        if (hasFixedItem) {
          const itemToFetch = itemId || loan?.item_id;
          const response = await api.get(`/items/${itemToFetch}`);
          setItems([response.data]);
        } else {
          // Otherwise fetch all items or search results
          const endpoint = searchTerm && searchTerm.length > 2
            ? `/items/search?q=${searchTerm}`
            : '/items';

          const response = await api.get(endpoint);
          setItems(response.data || []);
        }
      } catch (error) {
        console.error('Error fetching items:', error);
        toast.error('Failed to load items');
      } finally {
        setLoadingItems(false);
      }
    };

    fetchItems();
  }, [loan?.item_id, itemId, hasFixedItem, searchTerm]);

  // Handle item search
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Form validation schema
  const validationSchema = Yup.object({
    item_id: Yup.number()
      .required('Item is required'),
    loan_id: Yup.number().nullable(),
    severity: Yup.string()
      .oneOf(['low', 'medium', 'high', 'critical'], 'Invalid severity')
      .required('Severity is required'),
    description: Yup.string()
      .required('Description is required')
      .min(10, 'Description must be at least 10 characters')
      .max(1000, 'Description must be 1000 characters or less'),
    notes: Yup.string()
      .max(500, 'Notes must be 500 characters or less')
  });

  // Initialize form with loan/item data if provided
  const formik = useFormik({
    initialValues: {
      item_id: itemId || loan?.item_id || '',
      loan_id: loan?.loan_id || '',
      severity: 'medium',
      description: '',
      notes: ''
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        setLoading(true);

        // Add user ID if available
        const ticketData = {
          ...values,
          user_id: user?.id
        };

        const response = await api.post('/tickets', ticketData);
        toast.success('Maintenance ticket created successfully');

        if (onSubmitSuccess) {
          onSubmitSuccess(response.data);
        } else if (!inline) {
          // Navigate to ticket detail if not an inline form
          navigate(`/tickets/${response.data.id || response.data.ticket_id}`);
        }

        if (!hasFixedItem && !hasFixedLoan) {
          formik.resetForm();
        }
      } catch (error) {
        console.error('Error creating ticket:', error);
        toast.error(error.response?.data?.message || 'Failed to create ticket');
      } finally {
        setLoading(false);
      }
    }
  });

  return (
    <form onSubmit={formik.handleSubmit}>
      {/* Item Selection */}
      <div className="mb-3">
        <label htmlFor="item_id" className="form-label">Equipment Item *</label>
        {hasFixedItem ? (
          <div className="form-control disabled">
            {items[0]?.asset_tag || "Loading..."} - {items[0]?.model || items[0]?.model_name || ""}
            <input type="hidden" {...formik.getFieldProps('item_id')} />
          </div>
        ) : loadingItems ? (
          <div className="d-flex align-items-center mb-2">
            <div className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></div>
            <span>Loading items...</span>
          </div>
        ) : (
          <div>
            <div className="input-group mb-2">
              <input
                type="text"
                className="form-control"
                placeholder="Search by asset tag, name, or model"
                onChange={handleSearchChange}
                value={searchTerm}
              />
              {searchTerm && searchTerm.length > 2 && loadingItems && (
                <span className="input-group-text">
                  <div className="spinner-border spinner-border-sm" role="status"></div>
                </span>
              )}
            </div>
            <select
              id="item_id"
              className={`form-select ${formik.touched.item_id && formik.errors.item_id ? 'is-invalid' : ''}`}
              {...formik.getFieldProps('item_id')}
            >
              <option value="">Select an item</option>
              {items.map(item => (
                <option key={item.item_id || item.id} value={item.item_id || item.id}>
                  {item.asset_tag} - {item.model || item.model_name} ({item.category || item.category_name})
                </option>
              ))}
            </select>
          </div>
        )}
        {formik.touched.item_id && formik.errors.item_id && (
          <div className="invalid-feedback d-block">{formik.errors.item_id}</div>
        )}
      </div>

      {/* Associated Loan (if applicable) */}
      {hasFixedLoan && (
        <div className="mb-3">
          <label htmlFor="loan_id" className="form-label">Associated Loan</label>
          <div className="form-control disabled">
            Loan #{loan.loan_id}
          </div>
          <input type="hidden" {...formik.getFieldProps('loan_id')} />
        </div>
      )}

      {/* Severity */}
      <div className="mb-3">
        <label htmlFor="severity" className="form-label">Issue Severity *</label>
        <select
          id="severity"
          className={`form-select ${formik.touched.severity && formik.errors.severity ? 'is-invalid' : ''}`}
          {...formik.getFieldProps('severity')}
        >
          <option value="low">Low - Minor issue, can wait</option>
          <option value="medium">Medium - Needs attention soon</option>
          <option value="high">High - Urgent issue</option>
          <option value="critical">Critical - Immediate attention required</option>
        </select>
        {formik.touched.severity && formik.errors.severity && (
          <div className="invalid-feedback">{formik.errors.severity}</div>
        )}
      </div>

      {/* Description */}
      <div className="mb-3">
        <label htmlFor="description" className="form-label">Description of Issue *</label>
        <textarea
          id="description"
          className={`form-control ${formik.touched.description && formik.errors.description ? 'is-invalid' : ''}`}
          rows="4"
          placeholder="Describe the issue in detail"
          {...formik.getFieldProps('description')}
        />
        {formik.touched.description && formik.errors.description && (
          <div className="invalid-feedback">{formik.errors.description}</div>
        )}
      </div>

      {/* Additional Notes */}
      <div className="mb-3">
        <label htmlFor="notes" className="form-label">Additional Notes (optional)</label>
        <textarea
          id="notes"
          className={`form-control ${formik.touched.notes && formik.errors.notes ? 'is-invalid' : ''}`}
          rows="3"
          placeholder="Any other information that might help the technician..."
          {...formik.getFieldProps('notes')}
        />
        {formik.touched.notes && formik.errors.notes && (
          <div className="invalid-feedback">{formik.errors.notes}</div>
        )}
      </div>

      {/* Form Actions */}
      {inline ? (
        <div className="d-grid">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || loadingItems}
          >
            {loading ? (
              <span>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Creating Ticket...
              </span>
            ) : 'Create Maintenance Ticket'}
          </button>
        </div>
      ) : (
        <div className="d-grid gap-2 d-md-flex justify-content-md-end">
          <button
            type="button"
            className="btn btn-secondary me-md-2"
            disabled={loading || loadingItems}
            onClick={() => navigate(-1)}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || loadingItems}
          >
            {loading ? (
              <span>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Creating Ticket...
              </span>
            ) : 'Submit Ticket'}
          </button>
        </div>
      )}
    </form>
  );
};

export default TicketForm;