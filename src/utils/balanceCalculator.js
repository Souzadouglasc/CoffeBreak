/**
 * Calcula os saldos consolidados entre todos os usuários.
 *
 * @param {Array} purchases - Lista de compras com participantes
 *   Cada compra: { id, user_id, amount, description, date, participants: [{ user_id }] }
 * @param {Array} users - Lista de usuários { id, name }
 * @returns {Array} Lista de dívidas simplificadas
 *   Cada item: { from: userId, to: userId, fromName, toName, amount }
 */
export function calculateBalances(purchases, users) {
  // Mapa de nomes para exibição
  const nameMap = {};
  users.forEach((u) => {
    nameMap[u.id] = u.name;
  });

  // Matriz de saldos: balances[A][B] = quanto A deve para B
  const balances = {};

  purchases.forEach((purchase) => {
    const buyerId = purchase.user_id;
    const amount = parseFloat(purchase.amount);
    const participantIds = purchase.participants
      ? purchase.participants.map((p) => p.user_id)
      : [];

    // Se não há participantes, nada a dividir
    if (participantIds.length === 0) return;

    // Valor por pessoa (divisão igualitária)
    const share = amount / participantIds.length;

    participantIds.forEach((participantId) => {
      // O comprador não deve para si mesmo
      if (participantId === buyerId) return;

      // participantId deve 'share' para buyerId
      if (!balances[participantId]) balances[participantId] = {};
      if (!balances[participantId][buyerId]) balances[participantId][buyerId] = 0;
      balances[participantId][buyerId] += share;
    });
  });

  // Consolidar saldos (evitar dívida duplicada entre A↔B)
  const debts = [];
  const processed = new Set();

  Object.keys(balances).forEach((fromId) => {
    Object.keys(balances[fromId]).forEach((toId) => {
      const pairKey = [fromId, toId].sort().join('-');
      if (processed.has(pairKey)) return;
      processed.add(pairKey);

      const aOwesB = balances[fromId]?.[toId] || 0;
      const bOwesA = balances[toId]?.[fromId] || 0;
      const net = aOwesB - bOwesA;

      if (Math.abs(net) > 0.01) {
        if (net > 0) {
          debts.push({
            from: fromId,
            to: toId,
            fromName: nameMap[fromId] || 'Desconhecido',
            toName: nameMap[toId] || 'Desconhecido',
            amount: Math.round(net * 100) / 100,
          });
        } else {
          debts.push({
            from: toId,
            to: fromId,
            fromName: nameMap[toId] || 'Desconhecido',
            toName: nameMap[fromId] || 'Desconhecido',
            amount: Math.round(Math.abs(net) * 100) / 100,
          });
        }
      }
    });
  });

  return debts;
}

/**
 * Calcula o total gasto por cada usuário (como comprador).
 *
 * @param {Array} purchases - Lista de compras
 * @param {Array} users - Lista de usuários
 * @returns {Array} Lista { userId, name, total }
 */
export function calculateTotalPerUser(purchases, users) {
  const totals = {};
  users.forEach((u) => {
    totals[u.id] = { userId: u.id, name: u.name, total: 0 };
  });

  purchases.forEach((purchase) => {
    if (totals[purchase.user_id]) {
      totals[purchase.user_id].total += parseFloat(purchase.amount);
    }
  });

  return Object.values(totals)
    .map((t) => ({ ...t, total: Math.round(t.total * 100) / 100 }))
    .sort((a, b) => b.total - a.total);
}
