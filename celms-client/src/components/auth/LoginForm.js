import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';

const LoginForm = () => {
  const { login } = useUser();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // Form validation schema using Yup
  const validationSchema = Yup.object({
    email: Yup.string()
      .email('Invalid email address')
      .required('Email is required'),
    password: Yup.string()
      .required('Password is required')
  });

  const formik = useFormik({
    initialValues: {
      email: '',
      password: ''
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        setIsLoading(true);
        
        // Use the login method from UserContext which now uses apiClient
        const result = await login(values.email, values.password);
        
        if (result.success) {
          toast.success('Login successful');
          navigate('/');
        } else {
          toast.error(result.message || 'Failed to login');
        }
      } catch (error) {
        toast.error(error.message || 'An unexpected error occurred');
        console.error('Login error:', error);
      } finally {
        setIsLoading(false);
      }
    }
  });

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-5">
          <div className="card shadow">
            <div className="card-body p-4">
              <h2 className="text-center mb-4">Login</h2>
              <form onSubmit={formik.handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="email" className="form-label">Email</label>
                  <input
                    id="email"
                    type="email"
                    className={`form-control ${formik.touched.email && formik.errors.email ? 'is-invalid' : ''}`}
                    placeholder="Enter your email"
                    {...formik.getFieldProps('email')}
                  />
                  {formik.touched.email && formik.errors.email && (
                    <div className="invalid-feedback">{formik.errors.email}</div>
                  )}
                </div>

                <div className="mb-3">
                  <label htmlFor="password" className="form-label">Password</label>
                  <input
                    id="password"
                    type="password"
                    className={`form-control ${formik.touched.password && formik.errors.password ? 'is-invalid' : ''}`}
                    placeholder="Enter your password"
                    {...formik.getFieldProps('password')}
                  />
                  {formik.touched.password && formik.errors.password && (
                    <div className="invalid-feedback">{formik.errors.password}</div>
                  )}
                </div>

                <div className="mb-3 d-grid">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Logging in...
                      </span>
                    ) : 'Login'}
                  </button>
                </div>
              </form>

              <div className="text-center mt-3">
                <p className="small text-muted">
                  Please use your pre-assigned login credentials.
                </p>
                <div className="mt-3 p-3 bg-light rounded small">
                  <p className="mb-1"><strong>Demo Accounts:</strong></p>
                  <p className="mb-1">Admin: alice.admin@uni.local / Admin123!</p>
                  <p className="mb-1">Tech: tariq.tech@uni.local / Admin123!</p>
                  <p className="mb-1">Staff: samira.staff@uni.local / User123!</p>
                  <p className="mb-0">Student: youssef.student@uni.local / User123!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;