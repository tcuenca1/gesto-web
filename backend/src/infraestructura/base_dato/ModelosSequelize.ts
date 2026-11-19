import { DataTypes, Model, ModelStatic, Sequelize } from 'sequelize';

/**
 * Modelos del ORM Sequelize: una clase por tabla de base-datos/01_tablas.sql.
 *
 * El esquema, los triggers, los procedimientos y las vistas siguen viviendo en
 * los scripts SQL (SRS §9): los modelos solo describen las tablas para que los
 * adaptadores AdapSalida_*Sequelize lean y escriban sin armar SQL a mano.
 * Por eso no se usa sequelize.sync().
 */
export interface Modelos {
  sequelize: Sequelize;
  Rol: ModelStatic<Model>;
  Usuario: ModelStatic<Model>;
  Accion: ModelStatic<Model>;
  Gesto: ModelStatic<Model>;
  Asignacion: ModelStatic<Model>;
  Sesion: ModelStatic<Model>;
  Deteccion: ModelStatic<Model>;
  Bitacora: ModelStatic<Model>;
}

const SIN_FECHAS = { timestamps: false, freezeTableName: true } as const;

export function definirModelos(sequelize: Sequelize): Modelos {
  const Rol = sequelize.define(
    'Rol',
    {
      id_rol: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      nombre: { type: DataTypes.STRING(20), allowNull: false },
      descripcion: { type: DataTypes.STRING(150) },
    },
    { ...SIN_FECHAS, tableName: 'roles' },
  );

  const Usuario = sequelize.define(
    'Usuario',
    {
      id_usuario: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      nombre: { type: DataTypes.STRING(80), allowNull: false },
      correo: { type: DataTypes.STRING(120), allowNull: false },
      contrasena_hash: { type: DataTypes.STRING(100), allowNull: false },
      id_rol: { type: DataTypes.INTEGER, allowNull: false },
      activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      fecha_registro: { type: DataTypes.DATE },
      ultimo_acceso: { type: DataTypes.DATE },
      version_token: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    { ...SIN_FECHAS, tableName: 'usuarios' },
  );

  const Accion = sequelize.define(
    'Accion',
    {
      id_accion: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      codigo: { type: DataTypes.STRING(30), allowNull: false },
      nombre: { type: DataTypes.STRING(60), allowNull: false },
      descripcion: { type: DataTypes.STRING(200) },
      activa: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { ...SIN_FECHAS, tableName: 'acciones' },
  );

  const Gesto = sequelize.define(
    'Gesto',
    {
      id_gesto: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      codigo: { type: DataTypes.STRING(30), allowNull: false },
      nombre: { type: DataTypes.STRING(50), allowNull: false },
      descripcion: { type: DataTypes.STRING(200) },
      umbral_confianza: { type: DataTypes.DOUBLE, allowNull: false },
      id_accion_predeterminada: { type: DataTypes.INTEGER, allowNull: false },
      activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { ...SIN_FECHAS, tableName: 'gestos' },
  );

  const Asignacion = sequelize.define(
    'Asignacion',
    {
      id_asignacion: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      id_usuario: { type: DataTypes.INTEGER, allowNull: false },
      id_gesto: { type: DataTypes.INTEGER, allowNull: false },
      id_accion: { type: DataTypes.INTEGER, allowNull: false },
      fecha_actualizacion: { type: DataTypes.DATE },
    },
    { ...SIN_FECHAS, tableName: 'asignaciones' },
  );

  const Sesion = sequelize.define(
    'Sesion',
    {
      id_sesion: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      id_usuario: { type: DataTypes.INTEGER, allowNull: false },
      fecha_inicio: { type: DataTypes.DATE },
      fecha_fin: { type: DataTypes.DATE },
      navegador: { type: DataTypes.STRING(100) },
      total_detecciones: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    { ...SIN_FECHAS, tableName: 'sesiones_reconocimiento' },
  );

  const Deteccion = sequelize.define(
    'Deteccion',
    {
      id_deteccion: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      id_sesion: { type: DataTypes.INTEGER, allowNull: false },
      id_gesto: { type: DataTypes.INTEGER, allowNull: false },
      id_accion: { type: DataTypes.INTEGER },
      confianza: { type: DataTypes.DOUBLE, allowNull: false },
      mano: { type: DataTypes.STRING(10), allowNull: false },
      fecha_hora: { type: DataTypes.DATE },
    },
    { ...SIN_FECHAS, tableName: 'detecciones' },
  );

  const Bitacora = sequelize.define(
    'Bitacora',
    {
      id_bitacora: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      id_usuario: { type: DataTypes.INTEGER, allowNull: false },
      tabla_afectada: { type: DataTypes.STRING(40), allowNull: false },
      operacion: { type: DataTypes.STRING(10), allowNull: false },
      detalle: { type: DataTypes.JSONB },
      fecha_hora: { type: DataTypes.DATE },
    },
    { ...SIN_FECHAS, tableName: 'bitacora' },
  );

  Usuario.belongsTo(Rol, { foreignKey: 'id_rol', as: 'rol' });
  Bitacora.belongsTo(Usuario, { foreignKey: 'id_usuario', as: 'usuario' });

  return { sequelize, Rol, Usuario, Accion, Gesto, Asignacion, Sesion, Deteccion, Bitacora };
}
