-- SP 
USE `rrhh_db`;	
DROP procedure IF EXISTS `nuevoEmpleado`;

DELIMITER $$
USE `rrhh_db`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `nuevoEmpleado`(
	in _correo varchar(200),
    in _clave varchar(200),
	in _cedula varchar(9),
    in _nombre varchar(50),
    in _p_apellido varchar(50),
    in _s_apellido varchar(50),
    in _numero varchar(8),
    in _tipo_telefono tinyint,
    in _fecha_nacimiento datetime,
	in _codigo_provincia int,
	in _codigo_canton int,
	in _codigo_distrito int,
	in _direccion varchar(300)
) 
begin
	IF NOT EXISTS (select cedula from empleados where cedula = _cedula) THEN
		IF NOT EXISTS (select correo from empleados where correo = _correo) THEN
			insert into empleados (cedula, clave, nombre, p_apellido, s_apellido, correo, fecha_nacimiento)
			values(_cedula, _clave, _nombre, _p_apellido, _s_apellido, _correo, _fecha_nacimiento);
            insert into direccion (cedula, codigo_provincia, codigo_canton, codigo_distrito, direccion)
            values(_cedula, _codigo_provincia, _codigo_canton, _codigo_distrito, _direccion );
            insert into telefonos(numero, tipo_telefono, cedula)
			values(_numero, _tipo_telefono, _cedula);
            select 'Usuario registrado satisfactoriamente';
        END IF;
        select 'El Correo ya existe';
    END IF;
    select 'La cedula ya existe';
end$$

DELIMITER ;

DELIMITER ;
USE `rrhh_db`;
DROP procedure IF EXISTS `nuevoPermiso`;

DELIMITER $$
USE `rrhh_db`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `nuevoPermiso`(
	in _empleado_id integer,
	in _titulo varchar(200),
    in _descripcion varchar(200),
    in _fecha_salida datetime
) 
begin
     INSERT INTO permisos(empleado_id, titulo, descripcion, fecha_salida)
     VALUES (_empleado_id, _titulo, _descripcion, _fecha_salida);
end$$
DELIMITER ;



