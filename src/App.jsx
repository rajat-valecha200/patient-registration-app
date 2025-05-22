import React, { useEffect, useState } from 'react';
import { initializeDB, db } from './db/initDB';

function App() {
  const loadPatients = async () => {
    await db.exec(`INSERT INTO patients (name, age, gender) VALUES ('Test', 20, 'Male')`);

    const res = await db.query('SELECT * FROM patients');
    console.log('Patients:', res.rows);
  };

  useEffect(() => {
    initializeDB().then(loadPatients);
  }, []);

  return (
    <div className="min-h-screen bg-blue-50 p-6 font-sans">
      Test
    </div>
  );
}

export default App;
