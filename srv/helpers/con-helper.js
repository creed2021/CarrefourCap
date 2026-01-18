/**
 * Helper centralizado para traducir errores técnicos
 * (UNIQUE, FK, etc.) en errores de negocio compatibles
 * con Draft + Fiori Elements.
 */
async function informaFailConstraint(req, next) {
  try {
    // Ejecuta el handler real (CAP / persistencia)
    return await next();

  } catch (e) {
    const msg = (e.message || '').toLowerCase();

    // =========================
    // 🔑 UNIQUE constraint
    // =========================
    if (
      e.code === 'SQLITE_CONSTRAINT' ||        // SQLite local
      e.sqlState === '23000' ||                // HANA / SQL estándar
      msg.includes('unique') ||
      msg.includes('duplicate')
    ) {
      req.error({
        code: 'DUPLICATE_KEY',
        message: 'Ya existe un registro con los datos ingresados',
        target: 'campo' // ⚠️ ajustá al nombre real del campo
      });

      // 🔑 CLAVE: cortar el pipeline Draft
      return false;
    }

    // =========================
    // 🔗 FOREIGN KEY constraint
    // =========================
    if (
      msg.includes('foreign key') ||
      msg.includes('referential')
    ) {
      req.error({
        code: 'FK_CONSTRAINT',
        message: 'Existen datos relacionados que impiden continuar con esta operación'
      });

      return false;
    }

    // =========================
    // ❌ Error inesperado
    // =========================

    req.error({
      code: 'UNEXPECTED_ERROR',
      message: 'Error inesperado al procesar la solicitud'
    });

    return false;
  }
};

async function informaConstraintsDelete(req, next){      
        req.on('failed', () => {
          return req.reject(400, 'Existen datos relacionados que impiden continuar con esta operación');
        })        
        const res = await next()        
        return res
};

/**
 * Aplica reglas de protección e inmutabilidad
 * Compatible CAP + Draft + Fiori Elements
 * 
 * Cómo usarlo (flexible)
          ✔️ Solo inmutables
          this.before('UPDATE', 'Sectores',
            applyUpdateGuards({
              immutable: ['codigo']
            })
          );

          ✔️ Solo protección
          this.before('UPDATE', 'Sectores',
            applyUpdateGuards({
              isProtected: r => r.esSistema === true
            })
          );

          ✔️ Ambos
          this.before('UPDATE', 'Sectores',
            applyUpdateGuards({
              immutable: ['codigo'],
              isProtected: r => r.ID === '847ff617-9692-4b63-bb60-cc0a36b7b71a'
            })
          );
 */
function controlesCampoRegistro({
  immutable = [],
  isProtected
} = {}) {

  return async function (req) {

    if (!['UPDATE', 'draftActivate'].includes(req.event)) return;
    if (!req.data) return;

    const where = req.query?.UPDATE?.entity?.ref?.[0]?.where ||
                    req.query?.entity?.ref?.[0]?.where; // draftActiva

    if (!where) return;

    const tx = cds.transaction(req);
    const current = await tx.run(
      SELECT.one.from(req.target).where(where)
    );

    if (!current) return;

    // 🔒 Registro protegido
    if (isProtected && isProtected(current)) {
      req.error({
        code: 'PROTECTED_RECORD',
        message: 'Este registro no se puede modificar',
        target: 'ID'
      });
      return false;
    }

    // 🔐 Campos inmutables
    for (const field of immutable) {
      if (!(field in req.data)) continue;
      if (current[field] == req.data[field]) continue;

      req.error({
        code: 'IMMUTABLE_FIELD',
        message: `El campo '${field}' no puede ser modificado.`,
        target: field
      });
      return false;
    }
  };
}





module.exports = {
  informaFailConstraint,
  informaConstraintsDelete,
  controlesCampoRegistro
};
