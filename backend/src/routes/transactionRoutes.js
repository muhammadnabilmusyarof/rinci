const express = require('express');
const router = express.Router();
const {
  getSummary,
  getTransactionById,
  getAllTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} = require('../controllers/transactionController');

// PENTING: route spesifik harus di atas route param (:id)
router.get('/summary', getSummary);
router.get('/',        getAllTransactions);
router.get('/:id',     getTransactionById);
router.post('/',       createTransaction);
router.put('/:id',     updateTransaction);
router.delete('/:id',  deleteTransaction);

module.exports = router;
