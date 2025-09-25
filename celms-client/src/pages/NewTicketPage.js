import React from 'react';
import { useParams } from 'react-router-dom';
import TicketForm from '../components/forms/TicketForm';

const NewTicketPage = () => {
  const { itemId } = useParams(); // For when creating a ticket for a specific item

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-primary text-white">
              <h2 className="mb-0">Report Maintenance Issue</h2>
            </div>
            <div className="card-body">
              <p className="lead mb-4">
                Use this form to report equipment issues, damage, or maintenance needs.
                A technician will review your request and take appropriate action.
              </p>

              <TicketForm itemId={itemId} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewTicketPage;