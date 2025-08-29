// Debug do problema de data - um dia a menos
// Execute com: node debug-date-issue.js

function debugDateCalculation() {
  console.log('=== DEBUG: PROBLEMA DE UM DIA A MENOS ===\n');
  
  // Simular exatamente o que acontece no AddTransactionModal
  const purchaseDateString = '2025-08-22'; // String como vem do input
  const closingDay = 28;
  
  console.log('String da data de entrada:', purchaseDateString);
  console.log('Dia de fechamento:', closingDay);
  console.log('');
  
  // Simular a conversão no AddTransactionModal
  console.log('=== CONVERSÃO NO ADDTRANSACTIONMODAL ===');
  const [year, month, day] = purchaseDateString.split('-').map(Number);
  console.log('Parsed - Year:', year, 'Month:', month, 'Day:', day);
  
  const purchaseDateObj = new Date(year, month - 1, day);
  console.log('Data objeto criada:', purchaseDateObj.toLocaleDateString('pt-BR'));
  console.log('Data objeto ISO:', purchaseDateObj.toISOString());
  console.log('');
  
  // Verificar problemas de fuso horário
  console.log('=== VERIFICAÇÃO DE FUSO HORÁRIO ===');
  console.log('getDate():', purchaseDateObj.getDate());
  console.log('getMonth():', purchaseDateObj.getMonth());
  console.log('getFullYear():', purchaseDateObj.getFullYear());
  console.log('getTimezoneOffset():', purchaseDateObj.getTimezoneOffset());
  console.log('');
  
  // Simular o cálculo do FaturaCalculator
  console.log('=== SIMULAÇÃO DO FATURACALCULATOR ===');
  
  const purchaseDay = purchaseDateObj.getDate();
  console.log('Dia da compra extraído:', purchaseDay);
  
  // Simular getNextOccurrenceOfDay
  const yearCalc = purchaseDateObj.getFullYear();
  const monthCalc = purchaseDateObj.getMonth() + 1; // Convert to 1-indexed
  const currentDay = purchaseDateObj.getDate();
  
  console.log('Ano para cálculo:', yearCalc);
  console.log('Mês para cálculo (1-indexed):', monthCalc);
  console.log('Dia atual para cálculo:', currentDay);
  
  // Determinar próximo fechamento
  let nextClosingYear = yearCalc;
  let nextClosingMonth = monthCalc;
  
  if (currentDay < closingDay) {
    console.log('Fechamento ainda não passou neste mês');
  } else {
    nextClosingMonth = monthCalc === 12 ? 1 : monthCalc + 1;
    nextClosingYear = monthCalc === 12 ? yearCalc + 1 : yearCalc;
    console.log('Fechamento já passou - usar próximo mês');
  }
  
  console.log('Próximo fechamento:', `${nextClosingYear}-${nextClosingMonth}-${closingDay}`);
  
  // Calcular mês de cobrança
  let billingMonth = nextClosingMonth + 1; // Mês após o fechamento
  let billingYear = nextClosingYear;
  
  if (billingMonth > 12) {
    billingMonth = 1;
    billingYear++;
  }
  
  console.log('Mês de cobrança (1-indexed):', billingMonth);
  console.log('Ano de cobrança:', billingYear);
  
  // Criar data de lançamento (simulando createDateWithDayAdjustment)
  const launchDate = new Date(billingYear, billingMonth - 1, purchaseDay);
  
  console.log('Data de lançamento calculada:', launchDate.toLocaleDateString('pt-BR'));
  console.log('Data de lançamento ISO:', launchDate.toISOString());
  console.log('');
  
  // Simular a conversão de volta para string (como no AddTransactionModal)
  console.log('=== CONVERSÃO DE VOLTA PARA STRING ===');
  const newYear = launchDate.getFullYear();
  const newMonth = String(launchDate.getMonth() + 1).padStart(2, '0');
  const newDay = String(launchDate.getDate()).padStart(2, '0');
  const resultString = `${newYear}-${newMonth}-${newDay}`;
  
  console.log('String resultado:', resultString);
  console.log('');
  
  console.log('=== RESULTADO FINAL ===');
  console.log('Entrada: 2025-08-22');
  console.log('Esperado: 2025-09-22');
  console.log('Atual:', resultString);
  
  if (newDay === '21') {
    console.log('❌ PROBLEMA CONFIRMADO: Está retornando dia 21 ao invés de 22');
  } else if (newDay === '22') {
    console.log('✅ Data correta!');
  }
  
  // Teste adicional com diferentes datas
  console.log('\n=== TESTE COM MÚLTIPLAS DATAS ===');
  const testDates = ['2025-08-22', '2025-08-28', '2025-08-29', '2025-08-31'];
  
  testDates.forEach(dateStr => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    
    // Cálculo simplificado
    let targetMonth = m;
    if (d > closingDay) {
      targetMonth += 2;
    } else {
      targetMonth += 1;
    }
    
    if (targetMonth > 12) {
      targetMonth -= 12;
    }
    
    const resultDate = new Date(y, targetMonth - 1, d);
    const resultStr = `${resultDate.getFullYear()}-${String(resultDate.getMonth() + 1).padStart(2, '0')}-${String(resultDate.getDate()).padStart(2, '0')}`;
    
    console.log(`${dateStr} → ${resultStr} (dia ${resultDate.getDate()})`);
  });
}

debugDateCalculation();