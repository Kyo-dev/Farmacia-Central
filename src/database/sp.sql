-- SP 

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
     VALUES (_empleado_id, _titulo, _descripcion, fecha_salida);
end$$
DELIMITER ;