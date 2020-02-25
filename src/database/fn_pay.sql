-- BRUTO
USE `rrhh_db`;
DROP function IF EXISTS `salarioBrutoEmpleado`;

DELIMITER $$
USE `rrhh_db`$$
CREATE DEFINER=`root`@`localhost` FUNCTION `salarioBrutoEmpleado`(
	_id varchar(9),
    _mes int,
    _anio int
) RETURNS decimal(10,2)
    READS SQL DATA
    DETERMINISTIC
BEGIN
    DECLARE totalSalarioHora int default 0;
    DECLARE totalHorasJornada int default 0;
    DECLARE hora int default 0;
	DECLARE total int default 0;
    IF (select sum(salario_hora) from salarios
    where activo = true and empleado_id = _id) <> 0 then 
		Set totalSalarioHora = (Select salario_hora from salarios
			where activo = true
			and empleado_id = _id);
		Set totalHorasJornada = (select jornada from salarios
			where activo = true
			and empleado_id = _id);
        Set hora = (select salario_hora from salarios 
            where activo = true
			and empleado_id = _id);
    end if;    
	set total = ((totalSalarioHora * totalHorasJornada)* 30);
    RETURN total;
END$$

DELIMITER ;

-- NETO

USE `rrhh_db`;
DROP function IF EXISTS `salarioNetoEmpleado`;

DELIMITER $$
USE `rrhh_db`$$
CREATE DEFINER=`root`@`localhost` FUNCTION `salarioNetoEmpleado`(
	_id varchar(9),
    _mes int,
    _anio int
) RETURNS decimal(10,2)
    READS SQL DATA
    DETERMINISTIC
BEGIN
	DECLARE totalHorasExtra int default 0;
	DECLARE totalPermisos int default 0;
    DECLARE totalSalarioHora int default 0;
    DECLARE totalHorasJornada int default 0;
	DECLARE totalBonos int default 0;
    DECLARE totalVacaciones int default 0;
    DECLARE hora int default 0;
	DECLARE total int default 0;
    DECLARE inc_ccss_dias smallint default -5;
    DECLARE inc_ins_dias smallint default -5;
    IF(Select sum(horas) from permisos
		where activo = true and empleado_id = _id 
		and year(fecha_salida) = _anio and month(fecha_salida) = _mes) <> 0 THEN
			Set totalPermisos = 
				(Select sum(horas) 
                from permisos 
                where activo = true 
                and empleado_id = _id 
                and year(fecha_salida) = _anio 
                and month(fecha_salida) = _mes);           
	end if;    
    IF (Select sum(cantidad) from bonos
		where activo = true and empleado_id = _id 
		and year(fecha) = _anio and month(fecha) = _mes) <> 0 then
			Set totalBonos = (Select sum(cantidad) from bonos
				where activo = true 
                and empleado_id = _id 
				and year(fecha) = _anio 
                and month(fecha) = _mes);
    end if;
	IF (Select sum(cantidad_horas) from horas_extra
		where activo = true and empleado_id = _id
		and year(fecha) = _anio and month(fecha) = _mes) <> 0 then
			Set totalHorasExtra = (Select sum(cantidad_horas) from horas_extra
				where activo = true
                and empleado_id = _id
                and year(fecha) = _anio
                and month(fecha) = _mes);
	end if; 
    IF(select sum(cantidad) from fechas_vacaciones
		where activo = true and empleado_id = _id
        and year(fecha_salida) = _anio and month(fecha_salida) = _mes) <> 0 then 
        Set totalVacaciones = (select sum(cantidad) from fechas_vacaciones
		where activo = true 
        and empleado_id = _id
        and year(fecha_salida) = _anio 
        and month(fecha_salida) = _mes);
	end if;
    IF (select sum(salario_hora) from salarios
    where activo = true and empleado_id = _id) <> 0 then 
		Set totalSalarioHora = (Select salario_hora from salarios
			where activo = true
			and empleado_id = _id);
		Set totalHorasJornada = (select jornada from salarios
			where activo = true
			and empleado_id = _id);
        Set hora = (select salario_hora from salarios 
            where activo = true
			and empleado_id = _id);
    end if;    
	set total = ( ((totalSalarioHora * totalHorasJornada)* 30) + (totalVacaciones * totalSalarioHora * totalHorasJornada*-1) + + (totalVacaciones * totalSalarioHora * totalHorasJornada) + (hora*totalPermisos*-1) + (totalHorasExtra * totalSalarioHora * 1.5) + (totalBonos) + (totalSalarioHora * totalHorasJornada * inc_ccss_dias) + (totalSalarioHora * totalHorasJornada * inc_ccss_dias) + ((((totalSalarioHora * totalHorasJornada)*5)*50)/100) + (totalSalarioHora * totalHorasJornada * inc_ins_dias)  );
    RETURN total;
END$$

DELIMITER ;

-- salario del mes + -vacaciones + - permisos + horas extra


-- AGUINALDO

USE `rrhh_db`;
DROP function IF EXISTS `salarioAguinaldo`;

DELIMITER $$
USE `rrhh_db`$$
CREATE DEFINER=`root`@`localhost` FUNCTION `salarioAguinaldo`(
	_id int,
    _mes int,
    _anio int
) RETURNS decimal(10,2)
    READS SQL DATA
    DETERMINISTIC
BEGIN
	DECLARE totalMes int default 12;
    DECLARE totalAnio int default 0;
    DECLARE totalSalarioHora int default 0;
    DECLARE totalHorasJornada int default 0;
    DECLARE totalBonos int default 0;
    DECLARE totalHorasExtra int default 0;
    DECLARE auxBonos int default 0;
    DECLARE auxHorasExtra int default 0;
    DECLARE hora int default 0;
	DECLARE total int default 0;
    DECLARE salarioAnual int default 0;
    DECLARE resultado int default 0;
    DECLARE anioContratacion int;
    DECLARE mesContratacion int;
    DECLARE mesCount int;
    set totalAnio = _anio - 1;
    IF (select sum(salario_hora) from salarios
    where activo = true and empleado_id = _id) <> 0 then 
		Set totalSalarioHora = (Select salario_hora from salarios
			where activo = true
			and empleado_id = _id);
		Set totalHorasJornada = (select jornada from salarios
			where activo = true
			and empleado_id = _id);
        Set hora = (select salario_hora from salarios 
            where activo = true
			and empleado_id = _id);
    end if;
    set anioContratacion =  (select year(fecha_contrato) from empleados where id = _id);
    IF anioContratacion <> substr(now(), 1, 4) then
     IF (Select sum(cantidad) from bonos
		where activo = true and empleado_id = _id 
		and year(fecha) = totalAnio and month(fecha) = totalMes) <> 0 then
			Set totalBonos = (Select sum(cantidad) from bonos
				where activo = true 
                and empleado_id = _id 
				and year(fecha) = totalAnio 
                and month(fecha) = totalMes);
    end if;
	IF (Select sum(cantidad_horas) from horas_extra
		where activo = true and empleado_id = _id
		and year(fecha) = totalAnio and month(fecha) = totalMes) <> 0 then
			Set totalHorasExtra = (Select sum(cantidad_horas) from horas_extra
				where activo = true
                and empleado_id = _id
                and year(fecha) = totalAnio
                and month(fecha) = totalMes);
	end if; 
    set totalAnio = totalAnio + 1 ;
    set totalMes = 1;
    set auxBonos = totalBonos;
    set auxHorasExtra = totalHorasExtra;
    set totalBonos = 0;
    set totalHorasExtra = 0;
    while totalMes < 11 do
     IF (Select sum(cantidad) from bonos
		where activo = true and empleado_id = _id 
		and year(fecha) = totalAnio and month(fecha) = totalMes) <> 0 then
			Set totalBonos = (Select sum(cantidad) from bonos
				where activo = true 
                and empleado_id = _id 
				and year(fecha) = totalAnio 
                and month(fecha) = totalMes);
    end if;
	IF (Select sum(cantidad_horas) from horas_extra
		where activo = true and empleado_id = _id
		and year(fecha) = totalAnio and month(fecha) = totalMes) <> 0 then
			Set totalHorasExtra = (Select sum(cantidad_horas) from horas_extra
				where activo = true
                and empleado_id = _id
                and year(fecha) = totalAnio
                and month(fecha) = totalMes);
	end if; 
	set auxBonos = auxBonos + totalBonos;
    set auxHorasExtra = auxHorasExtra + totalHorasExtra;
	set totalBonos = 0;
    set totalHorasExtra = 0;
    set totalMes = totalMes + 1;
    end while;
    set salarioAnual =  (((totalSalarioHora * totalHorasJornada)* 30) *12);
	set total = salarioAnual + auxBonos + (hora * auxHorasExtra * 1.5);
    set resultado = total / 12;
    else 
    
    set mesContratacion =  (select month(fecha_contrato) from empleados where id = _id);
    set mesCount = ((mesContratacion - 11)* -1 );
    set totalMes = mesContratacion;
    while totalMes < 11 do
     IF (Select sum(cantidad) from bonos
		where activo = true and empleado_id = _id 
		and year(fecha) = anioContratacion and month(fecha) = totalMes) <> 0 then
			Set totalBonos = (Select sum(cantidad) from bonos
				where activo = true 
                and empleado_id = _id 
				and year(fecha) = anioContratacion 
                and month(fecha) = totalMes);
    end if;
	IF (Select sum(cantidad_horas) from horas_extra
		where activo = true and empleado_id = _id
		and year(fecha) = anioContratacion and month(fecha) = totalMes) <> 0 then
			Set totalHorasExtra = (Select sum(cantidad_horas) from horas_extra
				where activo = true
                and empleado_id = _id
                and year(fecha) = anioContratacion
                and month(fecha) = totalMes);
	end if; 
	set auxBonos = auxBonos + totalBonos;
    set auxHorasExtra = auxHorasExtra + totalHorasExtra;
	set totalBonos = 0;
    set totalHorasExtra = 0;
    set totalMes = totalMes + 1;
    end while;
    set salarioAnual =  (((totalSalarioHora * totalHorasJornada)* 30) * mesContratacion);
	set total = salarioAnual + auxBonos + (hora * auxHorasExtra * 1.5);
    set resultado = total / mesContratacion;
    end if;
    RETURN resultado;
END$$

DELIMITER ;

-- SALARIO TRABAJADOR



USE `rrhh_db`;
DROP function IF EXISTS `salarioEmpleado`;

DELIMITER $$
USE `rrhh_db`$$
CREATE DEFINER=`root`@`localhost` FUNCTION `salarioEmpleado`(
	_id varchar(9),
    _mes int,
    _anio int
) RETURNS decimal(10,2)
    READS SQL DATA
    DETERMINISTIC
BEGIN
    DECLARE ccss_obrero int default 0;
    DECLARE ccss_sem int default 0;
	DECLARE totalSalarioHora int default 0;
    DECLARE totalHorasJornada int default 0;
    DECLARE neto int default 0;
    DECLARE dia int ;
	DECLARE resultado int;
    IF (select sum(salario_hora) from salarios
    where activo = true and empleado_id = _id) <> 0 then 
		Set totalSalarioHora = (Select salario_hora from salarios
			where activo = true
			and empleado_id = _id);
		Set totalHorasJornada = (select jornada from salarios
			where activo = true
			and empleado_id = _id);
    end if;    
	set dia = (totalSalarioHora * totalHorasJornada);
    set neto = (select salarioNetoEmpleado(_id, _mes, _anio));
    set ccss_obrero = (((neto * 10.5)/ 100)*-1);
    set resultado =  neto + ccss_obrero + 20000 - 100000;
    RETURN resultado;
END$$

DELIMITER ;



select * from bonos;
-- SALARIO SIN REBAJAS
select salarioBrutoEmpleado(5, '02', '2020');
-- SALARIO CON EXTRAS
select salarioNetoEmpleado(5, '02', '2020');
-- AGUINALDO
select salarioAguinaldo(5, '02', '2020');
-- PAGO DEL MES 
select salarioEmpleado(5, '02', '2020');

select year(fecha_contrato) from empleados where id = 5;
select substr(now(), 1, 4) as fecha;
-- + (totalHorasExtra * (totalSalarioHora * 1.5)) + (hora*totalPermisos)*-1) 

