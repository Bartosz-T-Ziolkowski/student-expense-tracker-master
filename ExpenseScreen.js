import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';

export default function ExpenseScreen() {
  const db = useSQLiteContext();

  const [expenses, setExpenses] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState('');

  const [editId, setEditId] = useState(null);

  useEffect(() => {
    setup();
  }, []);

  async function setup() {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        note TEXT,
        date TEXT NOT NULL
      );
    `);

    loadExpenses();
  }

  const loadExpenses = async () => {
    const rows = await db.getAllAsync(
      'SELECT * FROM expenses ORDER BY id DESC;'
    );
    setExpenses(rows);
  };

  async function saveExpense() {
    if (!amount || !category) return;

    const today = new Date().toISOString().slice(0, 10);
    const useDate = date || today;

    if (editId === null) {
      await db.runAsync(
        'INSERT INTO expenses (amount, category, note, date) VALUES (?, ?, ?, ?);',
        [parseFloat(amount), category, note || null, useDate]
      );
    } else {
      await db.runAsync(
        'UPDATE expenses SET amount = ?, category = ?, note = ?, date = ? WHERE id = ?;',
        [parseFloat(amount), category.trim(), note.trim(), useDate, editId]
      );
  }

    setAmount('');
    setCategory('');
    setNote('');
    setDate('');
    setEditId(null);

    loadExpenses();
  };


  const deleteExpense = async (id) => {
    await db.runAsync('DELETE FROM expenses WHERE id = ?;', [id]);
    loadExpenses();
  };

  function startEditing(item) {
    setEditId(item.id);
    setAmount(string(item.amount));
    setCategory(item.category);
    setNote(item.note || '');
    setDate(item.date);
  }

  function getFiltered() {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());

    if (filter === 'WEEK') {
      return expenses.filter((e) => new Date(e.date) >= weekStart);
    }

    if (filter === 'MONTH') {
      return expenses.filter((e) => {
        const d = new Date(e.date);
        return (
          d.getMonth() ===now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      });
    }

    return expenses;
  }

  const filtered = getFiltered();

  const total = filtered.reduce((sum, e) => sum + e.amount, 0);

  const categoryTotals = {};
  filtered.forEach((e) => {
    categoryTotals[e.category] =
      (categoryTotals[e.category] || 0) + e.amount;
  });
}