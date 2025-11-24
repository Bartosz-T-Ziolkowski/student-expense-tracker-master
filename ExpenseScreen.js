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
  
 return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Expense Tracker</Text>

      <View style={styles.row}>
        <Button title="All" onPress={() => setFilter('ALL')} />
        <Button title="Week" onPress={() => setFilter('WEEK')} />
        <Button title="Month" onPress={() => setFilter('MONTH')} />
      </View>

      <Text style={styles.total}>Total: ${total.toFixed(2)}</Text>

      <Text style={styles.subheading}>By Category:</Text>
      {Object.entries(categoryTotals).map(([cat, val]) => (
        <Text key={cat} style={styles.categoryText}>
          {cat}: ${val.toFixed(2)}
        </Text>
      ))}

      <View style={styles.form}>
        <TextInput
          placeholder="Amount"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          style={styles.input}
        />
        <TextInput
          placeholder="Category"
          value={category}
          onChangeText={setCategory}
          style={styles.input}
        />
        <TextInput
          placeholder="Note"
          value={note}
          onChangeText={setNote}
          style={styles.input}
        />
        <TextInput
          placeholder="Date (YYYY-MM-DD)"
          value={date}
          onChangeText={setDate}
          style={styles.input}
        />

        <Button 
          title={editId === null ? "Add Expense" : "Save Changes"}
          onPress={saveExpense}
        />
      </View>
      
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.expenseRow}>
            <View>
              <Text>${item.amount.toFixed(2)}</Text>
              <Text>{item.category}</Text>
              <Text>{item.note}</Text>
              <Text>{item.date}</Text>
            </View>

            <View>
              <TouchableOpacity onPress={() => startEditing(item)}>
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteExpense(item.id)}>
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  subheading: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  total: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  categoryText: {
    fontSize: 16,
  },
  form: {
    marginVertical: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    marginVertical: 4,
    borderRadius: 4,
  },
  expenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  editText: {
    color: 'blue',
    marginBottom: 4,
  },
  deleteText: {
    color: 'red',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
});