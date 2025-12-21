export async function normalizePositions(model, where, idField, positionField, t) {
  const rows = await model.findAll({
    where,
    order: [[positionField, "ASC"], [idField, "ASC"]],
    transaction: t,
  });

  for (let i = 0; i < rows.length; i++) {
    if (rows[i][positionField] !== i) {
      await rows[i].update({ [positionField]: i }, { transaction: t });
    }
  }
}

export async function insertAtPosition(model, where, idField, positionField, targetId, newPosition, t) {
  const rows = await model.findAll({
    where,
    order: [[positionField, "ASC"], [idField, "ASC"]],
    transaction: t,
  });

  const ids = rows.map((r) => r[idField]);
  const filtered = ids.filter((id) => String(id) !== String(targetId));

  const pos = Math.max(0, Math.min(newPosition, filtered.length));
  filtered.splice(pos, 0, targetId);

  for (let i = 0; i < filtered.length; i++) {
    await model.update(
      { [positionField]: i },
      { where: { [idField]: filtered[i] }, transaction: t }
    );
  }
}
