/*

[DESCRIPTION]

- No description

*/

UPDATE ASIENTOS_MANUALES_PRD.COM_CARREFOUR_JOURNAL_ESTADOSSOLICITUD
SET 
    codigo = 'INI',
    nombre = 'Iniciada'
WHERE 
    codigo = 'REG'
    AND nombre = 'Registrada';