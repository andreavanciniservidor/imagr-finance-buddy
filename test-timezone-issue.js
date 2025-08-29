// Teste específico para problemas de fuso horário
// Execute com: node test-timezone-issue.js

function testTimezoneIssue() {
  console.log('=== TESTE DE PROBLEMA DE FUSO HORÁRIO ===\n');
  
  const dateString = '2025-08-22';
  console.log('String de entrada:', dateString);
  
  // Método 1: Como estamos fazendo (correto)
  const [year, month, day] = dateString.split('-').map(Number);
  const date1 = new Date(year, month - 1, day);
  console.log('Método 1 (correto):', date1.toLocaleDateString('pt-BR'));
  console.log('  - ISO:', date1.toISOString());
  console.log('  - getDate():', date1.getDate());
  
  // Método 2: Problemático (pode causar problemas de fuso)
  const date2 = new Date(dateString);
  console.log('Método 2 (problemático):', date2.toLocaleDateString('pt-BR'));
  console.log('  - ISO:', date2.toISOString());
  console.log('  - getDate():', date2.getDate());
  
  // Método 3: Com horário específico
  const date3 = new Date(dateString + 'T12:00:00');
  console.log('Método 3 (com horário):', date3.toLocaleDateString('pt-BR'));
  console.log('  - ISO:', date3.toISOString());
  console.log('  - getDate():', date3.getDate());
  
  console.log('\n=== COMPARAÇÃO DE DIAS ===');
  console.log('Método 1 - Dia:', date1.getDate());
  console.log('Método 2 - Dia:', date2.getDate());
  console.log('Método 3 - Dia:', date3.getDate());
  
  // Teste com formatação
  console.log('\n=== TESTE DE FORMATAÇÃO ===');
  
  const testDate = new Date(2025, 8, 22); // 22 de setembro
  console.log('Data teste (22 de setembro):', testDate.toLocaleDateString('pt-BR'));
  
  // Diferentes formas de formatar
  console.log('toLocaleDateString():', testDate.toLocaleDateString('pt-BR'));
  console.log('toLocaleDateString com opções:', testDate.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric'
  }));
  
  // Formatação manual
  const manualFormat = `${String(testDate.getDate()).padStart(2, '0')}/${String(testDate.getMonth() + 1).padStart(2, '0')}/${testDate.getFullYear()}`;
  console.log('Formatação manual:', manualFormat);
  
  // Teste de conversão de volta para string (como no código)
  console.log('\n=== TESTE DE CONVERSÃO PARA STRING ===');
  const backToString = `${testDate.getFullYear()}-${String(testDate.getMonth() + 1).padStart(2, '0')}-${String(testDate.getDate()).padStart(2, '0')}`;
  console.log('De volta para string:', backToString);
  
  // Verificar se há diferença de um dia
  console.log('\n=== VERIFICAÇÃO DE DIFERENÇA DE UM DIA ===');
  
  const originalDay = 22;
  const calculatedDay = testDate.getDate();
  
  console.log('Dia original:', originalDay);
  console.log('Dia calculado:', calculatedDay);
  console.log('Diferença:', calculatedDay - originalDay);
  
  if (calculatedDay === originalDay - 1) {
    console.log('❌ PROBLEMA: Está retornando um dia a menos!');
  } else if (calculatedDay === originalDay) {
    console.log('✅ Correto: Mesmo dia');
  } else {
    console.log('⚠️  Diferença inesperada');
  }
}

testTimezoneIssue();