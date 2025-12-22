select cuentacontable_ID
from COM_CARREFOUR_JOURNAL_UMBRALCUENTA UC
group by cuentacontable_ID
having count(1) > 1



SELECT *
FROM (
    SELECT
        ID,
        cuentacontable_ID,
        ROW_NUMBER() OVER (
            PARTITION BY cuentacontable_ID
            ORDER BY ID
        ) AS RN
    FROM COM_CARREFOUR_JOURNAL_UMBRALCUENTA
)
WHERE RN > 1;



DELETE FROM COM_CARREFOUR_JOURNAL_UMBRALCUENTA
WHERE ID IN (
    SELECT ID
    FROM (
        SELECT
            ID,
            ROW_NUMBER() OVER (
                PARTITION BY cuentacontable_ID
                ORDER BY ID
            ) AS RN
        FROM COM_CARREFOUR_JOURNAL_UMBRALCUENTA
    )
    WHERE RN > 1
);

select cu.numero, cu.nombre, tc.codigo, uc.importeGerencia, uc.importeCFO
from    COM_CARREFOUR_JOURNAL_CUENTA CU,
        COM_CARREFOUR_JOURNAL_UMBRALCUENTA UC,
        COM_CARREFOUR_JOURNAL_TIPOCUENTA TC
where cu.tipo_id = tc.id
and cu.id = uc.cuentacontable_ID
and tc.codigo in ('PAT', 'PRO', 'BAN')


UPDATE COM_CARREFOUR_JOURNAL_UMBRALCUENTA UC
SET
    UC.importeGerencia = 9999999999999,
    UC.importeCFO      = 9999999999999
WHERE UC.id IN (
    select uc2.id
    from    COM_CARREFOUR_JOURNAL_CUENTA CU
    join    COM_CARREFOUR_JOURNAL_UMBRALCUENTA UC2
            on cu.id = uc2.cuentacontable_ID
    join    COM_CARREFOUR_JOURNAL_TIPOCUENTA TC
            on cu.tipo_id = tc.id
    where tc.codigo in ('PAT', 'PRO', 'BAN')
);


select cu.numero, cu.nombre, tc.codigo, uc.importeGerencia, uc.importeCFO
from    COM_CARREFOUR_JOURNAL_CUENTA CU,
        COM_CARREFOUR_JOURNAL_UMBRALCUENTA UC,
        COM_CARREFOUR_JOURNAL_TIPOCUENTA TC
where cu.tipo_id = tc.id
and cu.id = uc.cuentacontable_ID
and (UC.importeGerencia = 0
        or UC.importeCFO      = 0)
        
        
select tc.codigo
from    COM_CARREFOUR_JOURNAL_CUENTA CU,
        COM_CARREFOUR_JOURNAL_UMBRALCUENTA UC,
        COM_CARREFOUR_JOURNAL_TIPOCUENTA TC
where cu.tipo_id = tc.id
and cu.id = uc.cuentacontable_ID
and (UC.importeGerencia = 0
        or UC.importeCFO      = 0)
group by tc.codigo
