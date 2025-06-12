import { useState } from 'react';
import './App.css';

function App() {
  const [name, setName] = useState(localStorage.getItem('name') || "");
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState(localStorage.getItem('phone') || "");
  const [results, setResults] = useState(JSON.parse(localStorage.getItem('r')) || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePayment = async () => {
    if (!amount || !phone) {
      setError("Amount and phone number are required");
      return;
    }

    // Validate phone number format (Kenyan format)
    if (!/^254[17]\d{8}$/.test(phone)) {
      setError("Please enter a valid Kenyan phone number (format: 2547XXXXXXXX)");
      return;
    }

    localStorage.setItem('name', name);
    localStorage.setItem('phone', phone);
    const backend_url = `http://localhost:5000/api/buy/mpesa`;

    try {
      setIsLoading(true);
      setError(null);
      
      const res = await fetch(backend_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount, phone })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Payment failed");
      }

      setResults(data);
      localStorage.setItem('r', JSON.stringify(data));
      
    } catch (err) {
      setError(err.message);
      console.error("Payment error:", err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="payment-container">
      {name && <h1 className="greeting">Hello, {name}</h1>}
      
      <form onSubmit={(e) => {
        e.preventDefault();
        handlePayment();
      }} className="payment-form">
        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input
            type="text"
            name='name'
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </div>

        <div className="form-group">
          <label htmlFor="phone">Phone Number (2547XXXXXXX)</label>
          <input
            type="tel"
            name='phone'
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="254712345678"
            pattern="254[17]\d{8}"
          />
        </div>

        <div className="form-group">
          <label htmlFor="amount">Amount (KES)</label>
          <input
            type="number"
            name='amount'
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="100"
            min="1"
          />
        </div>

        <button 
          type="submit" 
          className="pay-button"
          disabled={isLoading}
        >
          {isLoading ? 'Processing...' : 'Pay with M-Pesa'}
        </button>

        {error && <div className="error-message">{error}</div>}
      </form>

      {results && (
        <div className={`results ${results.success ? 'success' : 'error'}`}>
          <h3>{results.success ? '✅ Payment Successful' : '❌ Payment Failed'}</h3>
          <p>{results.message}</p>
          {results.ResponseCode && <p>Code: {results.ResponseCode}</p>}
        </div>
      )}
    </div>
  );
}

export default App;