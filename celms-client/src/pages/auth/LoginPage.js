import React from 'react';
import LoginForm from '../../components/auth/LoginForm';

const LoginPage = () => {
  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <LoginForm />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;