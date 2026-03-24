import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  GridItem,
  Input,
  Button,
  Select,
  Text,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useToast
} from '@chakra-ui/react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import axios from 'axios';
import Chart from '../components/Chart';
import OrderBook from '../components/OrderBook';

const Trading = () => {
  const { pair } = useParams();
  const [price, setPrice] = useState(0);
  const [orderType, setOrderType] = useState('limit');
  const [side, setSide] = useState('buy');
  const [amount, setAmount] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [balance, setBalance] = useState({});
  const toast = useToast();

  useEffect(() => {
    // Connect to WebSocket for real-time prices
    const socket = io('http://localhost:5000');
    socket.emit('subscribe', pair);
    socket.on('priceUpdate', (data) => {
      setPrice(data.price);
      setLimitPrice(data.price);
    });

    fetchBalance();
    fetchOrders();

    return () => socket.disconnect();
  }, [pair]);

  const fetchBalance = async () => {
    const token = localStorage.getItem('token');
    const response = await axios.get('http://localhost:5000/api/wallets/balance', {
      headers: { Authorization: `Bearer ${token}` }
    });
    setBalance(response.data);
  };

  const placeOrder = async () => {
    try {
      const token = localStorage.getItem('token');
      const orderData = {
        pair,
        side,
        order_type: orderType,
        amount: parseFloat(amount),
        price: orderType === 'limit' ? parseFloat(limitPrice) : null
      };

      await axios.post('http://localhost:5000/api/trades/place', orderData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast({
        title: 'Order placed',
        description: `Successfully placed ${side} order`,
        status: 'success',
        duration: 5000
      });

      setAmount('');
      fetchBalance();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to place order',
        status: 'error',
        duration: 5000
      });
    }
  };

  const [baseCurrency, quoteCurrency] = pair.split('/');

  return (
    <Box p={4} maxW="1400px" mx="auto">
      <Grid templateColumns="repeat(12, 1fr)" gap={4}>
        {/* Chart */}
        <GridItem colSpan={8}>
          <Box bg="gray.900" p={4} borderRadius="lg" h="500px">
            <Chart pair={pair} />
          </Box>
        </GridItem>

        {/* Order Form */}
        <GridItem colSpan={4}>
          <Box bg="gray.900" p={4} borderRadius="lg">
            <Text fontSize="xl" mb={4}>{pair}</Text>
            <Text fontSize="2xl" fontWeight="bold" mb={4}>
              ${price.toLocaleString()}
            </Text>

            <Tabs>
              <TabList>
                <Tab _selected={{ color: 'green.500' }}>Buy</Tab>
                <Tab _selected={{ color: 'red.500' }}>Sell</Tab>
              </TabList>
              <TabPanels>
                <TabPanel>
                  <Select mb={4} value={orderType} onChange={(e) => setOrderType(e.target.value)}>
                    <option value="market">Market</option>
                    <option value="limit">Limit</option>
                  </Select>

                  {orderType === 'limit' && (
                    <Input
                      placeholder="Price (USDT)"
                      type="number"
                      value={limitPrice}
                      onChange={(e) => setLimitPrice(e.target.value)}
                      mb={4}
                    />
                  )}

                  <Input
                    placeholder={`Amount (${baseCurrency})`}
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    mb={2}
                  />

                  <Text fontSize="sm" color="gray.400" mb={4}>
                    Balance: {balance[baseCurrency] || 0} {baseCurrency}
                  </Text>

                  <Button
                    colorScheme="green"
                    width="100%"
                    onClick={() => placeOrder()}
                  >
                    Buy {baseCurrency}
                  </Button>
                </TabPanel>

                <TabPanel>
                  <Select mb={4} value={orderType} onChange={(e) => setOrderType(e.target.value)}>
                    <option value="market">Market</option>
                    <option value="limit">Limit</option>
                  </Select>

                  {orderType === 'limit' && (
                    <Input
                      placeholder="Price (USDT)"
                      type="number"
                      value={limitPrice}
                      onChange={(e) => setLimitPrice(e.target.value)}
                      mb={4}
                    />
                  )}

                  <Input
                    placeholder={`Amount (${baseCurrency})`}
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    mb={2}
                  />

                  <Text fontSize="sm" color="gray.400" mb={4}>
                    Balance: {balance[baseCurrency] || 0} {baseCurrency}
                  </Text>

                  <Button
                    colorScheme="red"
                    width="100%"
                    onClick={() => {
                      setSide('sell');
                      placeOrder();
                    }}
                  >
                    Sell {baseCurrency}
                  </Button>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </Box>
        </GridItem>

        {/* Order Book */}
        <GridItem colSpan={4}>
          <Box bg="gray.900" p={4} borderRadius="lg">
            <Text fontWeight="bold" mb={3}>Order Book</Text>
            <OrderBook pair={pair} />
          </Box>
        </GridItem>

        {/* Open Orders */}
        <GridItem colSpan={8}>
          <Box bg="gray.900" p={4} borderRadius="lg">
            <Text fontWeight="bold" mb={3}>Open Orders</Text>
            {/* Add orders table here */}
          </Box>
        </GridItem>
      </Grid>
    </Box>
  );
};

export default Trading;