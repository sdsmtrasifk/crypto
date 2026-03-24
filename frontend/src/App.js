import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import Dashboard from './pages/Dashboard';
import Trading from './pages/Trading';
import Wallet from './pages/Wallet';
import Referral from './pages/Referral';
import Login from './pages/Login';
import Register from './pages/Register';
import PrivateRoute from './components/PrivateRoute';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ChakraProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/trading/:pair" element={<PrivateRoute><Trading /></PrivateRoute>} />
            <Route path="/wallet" element={<PrivateRoute><Wallet /></PrivateRoute>} />
            <Route path="/referral" element={<PrivateRoute><Referral /></PrivateRoute>} />
          </Routes>
        </Router>
      </ChakraProvider>
    </QueryClientProvider>
  );
}

export default App;