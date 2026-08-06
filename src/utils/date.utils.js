export const normalizeToUTCDate = (date) => {
  if (!date) {
    throw new Error("La fecha es obligatoria.");
  }

  const d = new Date(date);
  
  if (isNaN(d.getTime())) {
    throw new Error("La fecha no es válida.");
  }

  return new Date(Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate()
  ));
};