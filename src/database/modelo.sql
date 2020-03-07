-- MODELO DE BASE DE DATOS

create database rrhh_db;

use rrhh_db;

-- create table farmacia (
-- id tinyint auto_increment,
 --   nombre varchar(50) not null,
 --   hora_apertura varchar (10) not null,
 --   hora_cierre varchar(10) not null,
 --   ccss_sem decimal(6,2) not null,
 --   ccss_ivm decimal(6,2) not null,
 --   lpt_aportepbp decimal(6,2) not null,
 --   lpt_fondo_laboral decimal(6,2) not null,
-- lpt_fondo_pensiones decimal(6,2) not null,
--    lpt_aportetbp decimal(6,2) not null,
--    ins decimal(6.2) not null,
--    activo boolean default true not null,
--    constraint pk_farmacia primary key(id)
-- );

create table tipo_empleados(
	id tinyint auto_increment not null,
    nombre_cargo varchar(50) not null,
    activo boolean default true,
    constraint pk_tipo_empleado primary key(id)
);

create table empleados(
	id int not null auto_increment,
    cedula varchar(10) unique not null,
    farmacia tinyint default 1 not null,
    fecha_contrato datetime default now() not null,
	tipo_empleado tinyint default 5 not null,
    aprobado boolean default false not null,
    temporal boolean default false not null,
	activo boolean default true not null,
    fecha_nacimiento datetime default '2000-01-10'  not null,
	nombre varchar(100) not null,
    p_apellido varchar(100) not null,
    s_apellido varchar(100) not null,
	correo varchar(200) not null unique,
    -- url_documento varchar(300) default 'No se ha registrado el resumen' not null,
    clave varchar(200) not null,
	constraint fk_empleados_tipo_empleado foreign key(tipo_empleado) references tipo_empleados(id),
    constraint pk_empleados primary key(id)
);

ALTER TABLE empleados ADD CONSTRAINT fk_empleados_tipo_empleado FOREIGN KEY (tipo_empleado) REFERENCES tipo_empleados(id);

create table empleados_temporales(
	 id int auto_increment,
	 empleado_id int not null,
     fecha datetime default now() not null,
     descripcion varchar(300) not null,
	 constraint fk_temporales_empleados foreign key (empleado_id) references empleados(id),
     constraint pk_empleados_temporales primary key(id)
 );

create table fechas_empleado_temporal(
	id int auto_increment,
	empleado_id int not null,
    fecha datetime default now() unique not null,
    descripcion varchar(200) not null,
    activo boolean default true,
    dias int default 0,
    constraint pk_fechas_emplado_temporal primary key (id),
    constraint fk_fechas_temporales_empleados foreign key (empleado_id) references empleados(id)
);

create table despidos(
    id int auto_increment not null,
	empleado_id int not null,
    descripcion varchar(300) not null,
    url_documento varchar(100) not null,
    fecha_despido datetime default now() not null,
    activo boolean default true,
    constraint fk_despidos_empleados foreign key (empleado_id) references empleados(id),
    constraint pk_despidos primary key(id)
);

create table tipo_telefonos(
	id tinyint auto_increment,
    nombre varchar(100) not null,
    constraint pk_tipo_telefonos primary key(id)
);

create table telefonos(
	id int auto_increment,
    numero varchar(8) not null,
	empleado_id int not null,
    tipo_telefono tinyint default 1 not null,
    activo boolean default true,
    constraint fk_telefonos_tipo_telefono foreign key(tipo_telefono) references tipo_telefonos(id),
    constraint fk_telefonos_empleados foreign key (empleado_id) references empleados(id),
    constraint pk_telefonos primary key (id)
);
create table tareas(
	id int auto_increment not null,
    titulo varchar(50) not null,
    descripcion varchar(300) not null,
    activo boolean default true,
    fecha_solicitud datetime default now(),
    tipo_empleado tinyint not null,
	estado tinyint default 1 not null,
    constraint fk_tareas_tipo_empleado foreign key(tipo_empleado) references tipo_empleados(id),
    constraint fk_tareas_estadoo foreign key (estado) references estados (id),
    constraint pk_tareas primary key (id)
);
create table realizar_tarea(
	id int not null auto_increment,
	empleado_id int not null,
    fecha_realizacion datetime default now(),
    id_tarea int not null,
    constraint fk_realizar_tareas_tarea foreign key(id_tarea) references tareas(id),
    constraint fk_realizar_tareas_empleados foreign key (empleado_id) references empleados(id),
    constraint pk_realizar_tareas primary key (id)
);
create table estados(
	id tinyint auto_increment not null,
    estado varchar(20) not null,
    activo boolean default true,
    constraint pk_estado_permiso primary key(id)
);
create table permisos(
	id int not null auto_increment,
    estado tinyint default 1 not null,
    titulo varchar(100) not null,  	
    descripcion varchar(100) not null,
	fecha_solicitud datetime default now() not null,
    fecha_salida datetime not null,
    horas tinyint default 0 not null,
    hora_salida varchar(20) default 0 not null,
    activo boolean default true,
    borrar boolean default false,
    empleado_id int not null,
    -- costo_salarial decimal(10,2) default 0 null,
	informacion_estado varchar(300) default 'EL permiso no ha sido revisado' not null,
    constraint pk_permisos primary key(id),
    constraint fk_permisos_estado_permiso foreign key (estado) references estados (id),
    constraint fk_permisos_empleados foreign key (empleado_id) references empleados(id)
);

create table asistencia(
	asistencia boolean default false,
    -- aprobado boolean default false, 
    fecha datetime default now(),
    empleado_id int not null,
    contador_dias int default 0 not null,
    constraint fk_asistencia_empleados foreign key (empleado_id) references empleados(id),
    constraint pk_asistencia primary key(empleado_id, fecha)
);

CREATE TABLE dias_feriados(
	id int not null,
    dia date not null,
    descripcion varchar (50) not null,
    activo boolean not null,
    obligado boolean default true not null,
    constraint fk_feriados_asistencia foreign key (id_asistencia) references asistencia (fecha),
    constraint pk_dias_feriados primary key(id)
);

create table registro_disciplinario(
	id int auto_increment,
    empleado_id int not null,
    descripcion varchar(300) not null,
    fecha datetime default now() not null,
    activo boolean default true not null,
    constraint fk_registro_disciplina_empleados foreign key (empleado_id) references empleados(id),
    constraint pk_registro_disciplinario primary key(id)
);
create table horas_extra(
	id int auto_increment,
    empleado_id int not null,
	estado tinyint default 1 not null,
    cantidad_horas tinyint default 0 not null,
    motivo varchar(300) not null,
    fecha datetime default now() not null, 
    activo boolean default true not null,
    -- aprobado boolean default false not null,
    informacion_estado varchar(300) default 'La solicitud no ha sido revisada' not null,
    constraint fk_horas_extra_empleados foreign key (empleado_id) references empleados(id),
	constraint fk_horas_exta_estado_permiso foreign key (estado) references estados (id),
    constraint ch_horas_extra check(cantidad_horas > 0),
    constraint pk_horas_extra primary key(id)
);

create table salarios(
	id int auto_increment,
    empleado_id int not null,
	salario_hora decimal(10,2) not null,
    jornada decimal(4.2) not null,
    activo boolean default true not null,
    constraint fk_salarios_empleados foreign key (empleado_id) references empleados(id),
    constraint pk_salario primary key(id)
);
create table aumento_salarial(
	id int auto_increment,
    fecha datetime default now() not null,
    cantidad decimal(10,2) not null,
    activo boolean default true not null,
    empleado_id int not null,
	constraint fk_aumento_salario_empleados foreign key (empleado_id) references empleados(id),
    constraint ch_aumento_salarial check(cantidad >= 0),
    constraint pk_aumento_salarial primary key(id)
);
create table retencion_salarial(
	id int auto_increment,
    empleado_id int not null,
	retencion decimal(10,2) default 0 not null,
    fecha datetime default now() not null,
    descripcion varchar(300) not null,
    url_documento varchar(300) not null,
    activo boolean default true not null,
    constraint fk_retencion_salarial_empleados foreign key (empleado_id) references empleados(id),
    constraint pk_retencion_salarial primary key(id)
);
create table incapacidades(
    id int auto_increment,
    empleado_id int not null,
    fecha_salida date not null,
    fecha_entrada date not null,
    motivo varchar(200) not null,
    constraint fk_incapacidad_empleados foreign key (empleado_id) references empleados(id),
    constraint pk_incapacidad primary key(id)
);
ALTER TABLE incapacidades ADD column activo boolean not null default true;
ALTER TABLE incapacidades ADD column cantidad int not null default 0;

create table bonos(
	id int auto_increment,
    empleado_id int not null,
    motivo varchar(200) not null,
    cantidad decimal(10,2) not null,
    fecha datetime default now() not null, 
    activo boolean default true not null,
    constraint fk_bonos_empleados foreign key (empleado_id) references empleados(id),
    constraint ch_bonos check (cantidad >= 0),
    constraint pk_bonos primary key(id)
);
create table dias_disponibles(
    id int auto_increment,
    empleado_id int not null,
    cantidad_dias_disponibles int default 0 not null,
    activo boolean default true not null,
	fecha datetime default now() not null, 
    constraint fk_dias_disponibles_empleados foreign key (empleado_id) references empleados(id),
    constraint pk_dias_disponibles primary key(id)
);

create table fechas_vacaciones(
	id int auto_increment,
    empleado_id int not null,
    fecha_salida date not null,
    fecha_entrada date not null,
    activo boolean default true not null,
    constraint fk_vacaciones_empleados foreign key (empleado_id) references empleados(id),
    constraint pk_vacaciones primary key(id)
);

CREATE TABLE provincia (
  codigo_provincia smallint(5) NOT NULL AUTO_INCREMENT,
  nombre_provincia varchar(45) NOT NULL,
  constraint pk_provincia primary key (codigo_provincia)
);

CREATE TABLE canton (
  codigo_canton smallint(5) NOT NULL,
  codigo_provincia smallint(5)  NOT NULL,
  nombre_canton varchar(45) NOT NULL,
  constraint pk_canton primary key (codigo_canton),
  constraint fk_canton_provincia foreign key (codigo_provincia) references provincia (codigo_provincia)
);

CREATE TABLE distrito (
  codigo_distrito int(10)  NOT NULL,
  codigo_canton smallint(5)  NOT NULL,
  nombre_distrito varchar(45) NOT NULL,
  constraint pk_distrito primary key(codigo_distrito),
  constraint fk_distrito_canton foreign key(codigo_canton) references canton(codigo_canton)
);

create table direccion (
	id int auto_increment,
    empleado_id int not null,
    codigo_provincia smallint default 1 not null,
    codigo_canton smallint default 114 not null,
    codigo_distrito int default 11401 not null,
    direccion varchar(300) default ' ' not null,
    activo boolean default true not null,
    constraint fk_direccion_distrito foreign key(codigo_distrito) references distrito(codigo_distrito),
    constraint fk_direccion_canton foreign key(codigo_canton) references canton(codigo_canton),
    constraint fk_direccion_provincia  foreign key(codigo_provincia) references provincia(codigo_provincia),
    constraint fk_direccion_empleados foreign key (empleado_id) references empleados(id),
    constraint pk_direccion primary key(id)
);