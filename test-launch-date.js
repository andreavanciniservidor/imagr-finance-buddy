// Teste simples para verificar a nova lógica de cálculo de data de lançamento
// Execute com: node test-launch-date.js

// Simulação da nova lógica
function calculateLaunchDateNew(purchaseDate, closingDay) {
  const purchaseDay = purchaseDate.getDate();
  
  // Determinar o mês de cobrança baseado no fechamento
  let billingMonth = purchaseDate.getMonth();
  let billingYear = purchaseDate.getFullYear();
  
  // Se a compra foi após o fechamento, vai para o próximo ciclo
  if (purchaseDay > closingDay) {
    billingMonth += 2; // Próximo ciclo (2 meses à frente)
  } else {
    billingMonth += 1; // Ciclo atual (1 mês à frente)
  }
  
  // Ajustar ano se necessário
  if (billingMonth > 11) {
    billingYear += Math.floor(billingMonth / 12);
    billingMonth = billingMonth % 12;
  }
  
  // Criar data de lançamento mantendo o mesmo dia da compra
  const launchDate = new Date(billingYear, billingMonth, purchaseDay);
  
  // Ajustar se o dia não existe no mês (ex: 31 de fevereiro)
  if (launchDate.getDate() !== purchaseDay) {
    // Usar o último dia do mês
    launchDate.setDate(0);
  }
  
  return launchDate;
}

// Simulação da lógica antiga (sempre dia 10)
function calculateLaunchDateOld(purchaseDate, closingDay) {
  const purchaseDay = purchaseDate.getDate();
  
  let billingMonth = purchaseDate.getMonth();
  let billingYear = purchaseDate.getFullYear();
  
  if (purchaseDay > closingDay) {
    billingMonth += 2;
  } else {
    billingMonth += 1;
  }
  
  if (billingMonth > 11) {
    billingYear += Math.floor(billingMonth / 12);
    billingMonth = billingMonth % 12;
  }
  
  // Sempre usa o dia 10 (lógica antiga)
  return new Date(billingYear, billingMonth, 10);
}

// Testes
console.log('=== TESTE DE CÁLCULO DE DATA DE LANÇAMENTO ===\n');

const testCases = [
  { date: '2025-08-22', description: 'Compra em 22/08 (antes do fechamento dia 28)' },
  { date: '2025-08-28', description: 'Compra em 28/08 (dia do fechamento)' },
  { date: '2025-08-29', description: 'Compra em 29/08 (após o fechamento dia 28)' },
  { date: '2025-08-31', description: 'Compra em 31/08 (após o fechamento dia 28)' }
];

const closingDay = 28; // Dia de fechamento do cartão

testCases.forEach(testCase => {
  const [year, month, day] = testCase.date.split('-').map(Number);
  const purchaseDate = new Date(year, month - 1, day);
  
  const oldLaunchDate = calculateLaunchDateOld(purchaseDate, closingDay);
  const newLaunchDate = calculateLaunchDateNew(purchaseDate, closingDay);
  
  console.log(`${testCase.description}:`);
  console.log(`  Data da compra: ${purchaseDate.toLocaleDateString('pt-BR')}`);
  console.log(`  Lógica ANTIGA:  ${oldLaunchDate.toLocaleDateString('pt-BR')} (sempre dia 10)`);
  console.log(`  Lógica NOVA:    ${newLaunchDate.toLocaleDateString('pt-BR')} (mantém o dia ${day})`);
  console.log('');
});

console.log('=== RESULTADO ===');
console.log('✅ Agora as transações mantêm o mesmo dia da compra no mês de lançamento!');
console.log('✅ Exemplo: Compra em 28/08 → Lançamento em 28/09 (não mais 10/09)');