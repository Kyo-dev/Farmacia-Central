USE `rrhh_db`;
DROP event IF EXISTS `evento_domingo`;

CREATE EVENT evento_domingo
    ON SCHEDULE EVERY '1' WEEK 
    STARTS CURRENT_TIMESTAMP + INTERVAL 1 MINUTE
	DO call domingo;


USE `rrhh_db`;
DROP procedure IF EXISTS `domingo`;

DELIMITER $$
USE `rrhh_db`$$
CREATE PROCEDURE `domingo` ()
BEGIN
DECLARE salida int default 1;
DECLARE empleado int default 0;
DECLARE count int default 0;
select @auxTrabajadores := count(id) from empleados;
WHILE(salida <= @auxTrabajadores) DO
	select @empleado := cantidad_dias_disponibles from dias_disponibles where id = salida;
    SET count = @empleado + 1;
    UPDATE dias_disponibles
    SET cantidad_dias_disponibles = count
    WHERE id = salida;
    INSERT INTO asistencia (asistencia, empleado_id, contador_dias)
	VALUES(true, salida , 1);
    SET count = 0;
    SET @empleado = 0;
    SET salida = salida+1;
END WHILE;
END$$

DELIMITER ;

call domingo;


