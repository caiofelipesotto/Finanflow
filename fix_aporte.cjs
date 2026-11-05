const fs = require('fs');
let c = fs.readFileSync('C:\\Users\\Caio\\Finanflow\\src\\App.tsx', 'utf8');
const old = '};\r\n\r\n  const handleTogglePaid = (id: string) => {';
const newS = `};\r\n\r\n  const openAporteModal = (kind: 'aporte' | 'resgate') => {\r\n  setEditingTx(null);\r\n  setTxPreset({\r\n    type: kind === 'aporte' ? 'expense' : 'income',\r\n    category: APORTE_CATEGORY_ID,\r\n    paymentMethod: 'investment',\r\n    description: kind === 'aporte' ? 'Aporte' : 'Resgate',\r\n  });\r\n  setIsTxModalOpen(true);\r\n};\r\n\r\n  const handleTogglePaid = (id: string) => {`;
c = c.replace(old, newS);
fs.writeFileSync('C:\\Users\\Caio\\Finanflow\\src\\App.tsx', c);
console.log('Done');