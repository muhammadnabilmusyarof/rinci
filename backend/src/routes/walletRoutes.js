const express = require('express');
const router = express.Router();
const { getAllWallets, getTotalBalance, createWallet, updateWallet, deleteWallet } = require('../controllers/walletController');

router.get('/',       getAllWallets);
router.get('/total',  getTotalBalance);
router.post('/',      createWallet);
router.put('/:id',    updateWallet);
router.delete('/:id', deleteWallet);

module.exports = router;
