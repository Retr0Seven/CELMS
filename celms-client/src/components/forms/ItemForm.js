import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import api from '../../services/api';

// Equipment Item Form for creating and editing items
const ItemForm = ({ item = null, onSubmitSuccess }) => {
  const [categories, setCategories] = useState([]);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const isEditing = !!item; // Check if we're editing an existing item

  // Fetch categories and models on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesResponse, modelsResponse] = await Promise.all([
          api.get('/categories'),
          api.get('/models')
        ]);

        setCategories(categoriesResponse.data);
        setModels(modelsResponse.data);

        // If editing, set the selected category
        if (item && item.model_id) {
          const model = modelsResponse.data.find(m => m.model_id === item.model_id);
          if (model) {
            setSelectedCategory(model.category_id);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load categories and models');
      }
    };

    fetchData();
  }, [item]);

  // Get models for the selected category
  const filteredModels = models.filter(model =>
    selectedCategory ? model.category_id === selectedCategory : true
  );

  // Form validation schema
  const validationSchema = Yup.object({
    model_id: Yup.number()
      .required('Model is required'),
    asset_tag: Yup.string()
      .required('Asset tag is required')
      .max(50, 'Asset tag must be 50 characters or less'),
    status: Yup.string()
      .oneOf(['available', 'checked_out', 'out_of_service', 'retired', 'under_repair'], 'Invalid status')
      .required('Status is required'),
    location: Yup.string()
      .required('Location is required'),
    purchase_date: Yup.date()
      .nullable(),
    last_serviced: Yup.date()
      .nullable(),
    notes: Yup.string()
      .max(500, 'Notes must be 500 characters or less')
  });

  // Initialize form
  const formik = useFormik({
    initialValues: {
      model_id: item?.model_id || '',
      asset_tag: item?.asset_tag || '',
      status: item?.status || 'available',
      location: item?.location || '',
      purchase_date: item?.purchase_date || '',
      last_serviced: item?.last_serviced || '',
      notes: item?.notes || ''
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        setLoading(true);

        if (isEditing) {
          // Update existing item
          await api.put(`/items/${item.item_id}`, values);
          toast.success('Item updated successfully');
        } else {
          // Create new item
          await api.post('/items', values);
          toast.success('Item created successfully');
        }

        if (onSubmitSuccess) {
          onSubmitSuccess();
        }
      } catch (error) {
        console.error('Error submitting form:', error);
        toast.error(error.response?.data?.message || 'Failed to save item');
      } finally {
        setLoading(false);
      }
    }
  });

  // Handle category change to filter models
  const handleCategoryChange = (e) => {
    const categoryId = parseInt(e.target.value);
    setSelectedCategory(categoryId);
    formik.setFieldValue('model_id', ''); // Reset model when category changes
  };

  return (
    <form onSubmit={formik.handleSubmit}>
      <div className="row mb-3">
        <div className="col-md-6">
          <label htmlFor="category" className="form-label">Category</label>
          <select
            id="category"
            className="form-select"
            onChange={handleCategoryChange}
            value={selectedCategory || ''}
          >
            <option value="">Select a category</option>
            {categories.map(category => (
              <option key={category.category_id} value={category.category_id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="col-md-6">
          <label htmlFor="model_id" className="form-label">Model</label>
          <select
            id="model_id"
            className={`form-select ${formik.touched.model_id && formik.errors.model_id ? 'is-invalid' : ''}`}
            {...formik.getFieldProps('model_id')}
          >
            <option value="">Select a model</option>
            {filteredModels.map(model => (
              <option key={model.model_id} value={model.model_id}>
                {model.brand} {model.model_name}
              </option>
            ))}
          </select>
          {formik.touched.model_id && formik.errors.model_id && (
            <div className="invalid-feedback">{formik.errors.model_id}</div>
          )}
        </div>
      </div>

      <div className="row mb-3">
        <div className="col-md-6">
          <label htmlFor="asset_tag" className="form-label">Asset Tag</label>
          <input
            id="asset_tag"
            type="text"
            className={`form-control ${formik.touched.asset_tag && formik.errors.asset_tag ? 'is-invalid' : ''}`}
            {...formik.getFieldProps('asset_tag')}
          />
          {formik.touched.asset_tag && formik.errors.asset_tag && (
            <div className="invalid-feedback">{formik.errors.asset_tag}</div>
          )}
        </div>

        <div className="col-md-6">
          <label htmlFor="status" className="form-label">Status</label>
          <select
            id="status"
            className={`form-select ${formik.touched.status && formik.errors.status ? 'is-invalid' : ''}`}
            {...formik.getFieldProps('status')}
          >
            <option value="available">Available</option>
            <option value="checked_out">Checked Out</option>
            <option value="out_of_service">Out of Service</option>
            <option value="retired">Retired</option>
            <option value="under_repair">Under Repair</option>
          </select>
          {formik.touched.status && formik.errors.status && (
            <div className="invalid-feedback">{formik.errors.status}</div>
          )}
        </div>
      </div>

      <div className="row mb-3">
        <div className="col-md-6">
          <label htmlFor="location" className="form-label">Location</label>
          <input
            id="location"
            type="text"
            className={`form-control ${formik.touched.location && formik.errors.location ? 'is-invalid' : ''}`}
            {...formik.getFieldProps('location')}
          />
          {formik.touched.location && formik.errors.location && (
            <div className="invalid-feedback">{formik.errors.location}</div>
          )}
        </div>

        <div className="col-md-6">
          <label htmlFor="purchase_date" className="form-label">Purchase Date</label>
          <input
            id="purchase_date"
            type="date"
            className={`form-control ${formik.touched.purchase_date && formik.errors.purchase_date ? 'is-invalid' : ''}`}
            {...formik.getFieldProps('purchase_date')}
          />
          {formik.touched.purchase_date && formik.errors.purchase_date && (
            <div className="invalid-feedback">{formik.errors.purchase_date}</div>
          )}
        </div>
      </div>

      <div className="mb-3">
        <label htmlFor="last_serviced" className="form-label">Last Serviced</label>
        <input
          id="last_serviced"
          type="date"
          className={`form-control ${formik.touched.last_serviced && formik.errors.last_serviced ? 'is-invalid' : ''}`}
          {...formik.getFieldProps('last_serviced')}
        />
        {formik.touched.last_serviced && formik.errors.last_serviced && (
          <div className="invalid-feedback">{formik.errors.last_serviced}</div>
        )}
      </div>

      <div className="mb-3">
        <label htmlFor="notes" className="form-label">Notes</label>
        <textarea
          id="notes"
          className={`form-control ${formik.touched.notes && formik.errors.notes ? 'is-invalid' : ''}`}
          rows="3"
          {...formik.getFieldProps('notes')}
        />
        {formik.touched.notes && formik.errors.notes && (
          <div className="invalid-feedback">{formik.errors.notes}</div>
        )}
      </div>

      <div className="d-grid">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? (
            <span>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              {isEditing ? 'Updating...' : 'Creating...'}
            </span>
          ) : (
            isEditing ? 'Update Item' : 'Create Item'
          )}
        </button>
      </div>
    </form>
  );
};

export default ItemForm;