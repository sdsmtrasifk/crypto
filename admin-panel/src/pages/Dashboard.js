import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  GridItem,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Button
} from '@chakra-ui/react';
import axios from 'axios';

const AdminDashboard = () => {
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [deposits, setDeposits] = useState([]);

  useEffect(() => {
    fetchStats();
    fetchUsers();
    fetchPendingDeposits();
  }, []);

  const fetchStats = async () => {
    const token = localStorage.getItem('adminToken');
    const response = await axios.get('http://localhost:5000/api/admin/stats', {
      headers: { Authorization: `Bearer ${token}` }
    });
    setStats(response.data);
  };

  const fetchUsers = async () => {
    const token = localStorage.getItem('adminToken');
    const response = await axios.get('http://localhost:5000/api/admin/users', {
      headers: { Authorization: `Bearer ${token}` }
    });
    setUsers(response.data);
  };

  const fetchPendingDeposits = async () => {
    const token = localStorage.getItem('adminToken');
    const response = await axios.get('http://localhost:5000/api/admin/deposits/pending', {
      headers: { Authorization: `Bearer ${token}` }
    });
    setDeposits(response.data);
  };

  const confirmDeposit = async (depositId) => {
    const token = localStorage.getItem('adminToken');
    await axios.post(`http://localhost:5000/api/admin/deposits/${depositId}/confirm`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchPendingDeposits();
  };

  return (
    <Box p={6}>
      <Grid templateColumns="repeat(4, 1fr)" gap={6} mb={8}>
        <GridItem>
          <Stat bg="gray.900" p={4} borderRadius="lg">
            <StatLabel>Total Users</StatLabel>
            <StatNumber>{stats.totalUsers || 0}</StatNumber>
            <StatHelpText>+{stats.newUsersThisWeek || 0} this week</StatHelpText>
          </Stat>
        </GridItem>
        <GridItem>
          <Stat bg="gray.900" p={4} borderRadius="lg">
            <StatLabel>Total Volume (24h)</StatLabel>
            <StatNumber>${stats.dailyVolume || 0}</StatNumber>
          </Stat>
        </GridItem>
        <GridItem>
          <Stat bg="gray.900" p={4} borderRadius="lg">
            <StatLabel>Total Deposits</StatLabel>
            <StatNumber>${stats.totalDeposits || 0}</StatNumber>
          </Stat>
        </GridItem>
        <GridItem>
          <Stat bg="gray.900" p={4} borderRadius="lg">
            <StatLabel>Total Withdrawals</StatLabel>
            <StatNumber>${stats.totalWithdrawals || 0}</StatNumber>
          </Stat>
        </GridItem>
      </Grid>

      <Box bg="gray.900" p={6} borderRadius="lg" mb={6}>
        <Text fontSize="xl" fontWeight="bold" mb={4}>Pending Deposits</Text>
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>User</Th>
              <Th>Amount</Th>
              <Th>Currency</Th>
              <Th>Tx Hash</Th>
              <Th>Action</Th>
            </Tr>
          </Thead>
          <Tbody>
            {deposits.map(deposit => (
              <Tr key={deposit.id}>
                <Td>{deposit.user_email}</Td>
                <Td>{deposit.amount}</Td>
                <Td>{deposit.currency}</Td>
                <Td>{deposit.tx_hash.slice(0, 10)}...</Td>
                <Td>
                  <Button size="sm" colorScheme="green" onClick={() => confirmDeposit(deposit.id)}>
                    Confirm
                  </Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      <Box bg="gray.900" p={6} borderRadius="lg">
        <Text fontSize="xl" fontWeight="bold" mb={4}>Recent Users</Text>
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Email</Th>
              <Th>Full Name</Th>
              <Th>Referral Code</Th>
              <Th>Joined</Th>
              <Th>Status</Th>
            </Tr>
          </Thead>
          <Tbody>
            {users.slice(0, 10).map(user => (
              <Tr key={user.id}>
                <Td>{user.email}</Td>
                <Td>{user.full_name}</Td>
                <Td>{user.referral_code}</Td>
                <Td>{new Date(user.created_at).toLocaleDateString()}</Td>
                <Td>
                  <Badge colorScheme="green">Active</Badge>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
};

export default AdminDashboard;