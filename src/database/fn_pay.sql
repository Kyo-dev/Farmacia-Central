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
    DECLARE totalIncapacidades int default 0;
    DECLARE hora int default 0;
	DECLARE total int default 0;
    IF(select sum(cantidad) from incapacidades
    where activo = true and empleado_id = _id 
	and year(fecha_salida) = _anio and month(fecha_salida) = _mes) <> 0 then
		Set totalIncapacidades =  (Select sum(cantidad) from incapacidades
		where activo = true
		and empleado_id = 3
		and year(fecha_salida) = '2020'
		and month(fecha_salida) = '02');
    END IF;
    IF (select salario_hora from salarios
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
	set total = (totalSalarioHora * totalHorasJornada * (30-totalIncapacidades));
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
    DECLARE totalRetenciones int default 0;
	DECLARE bruto int default 0;
    DECLARE hora int default 0;
	DECLARE total int default 0;
	set bruto = (select salarioBrutoEmpleado(_id, _mes, _anio));
    IF(Select sum(horas) from permisos
		where activo = true and empleado_id = _id and estado = 2
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
    IF (Select sum(retencion) from retencion_salarial
		where activo = true and empleado_id = _id) <> 0 then
			Set totalRetenciones = (Select sum(retencion) from retencion_salarial
				where activo = true
                and empleado_id = _id);
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
	set total = ((bruto-totalRetenciones) + (totalVacaciones * totalSalarioHora * totalHorasJornada*-1) + (totalVacaciones * totalSalarioHora * totalHorasJornada) + (hora*totalPermisos*-1) + (totalHorasExtra * totalSalarioHora * 1.5) + (totalBonos) + ((((totalSalarioHora * totalHorasJornada)*5)*50)/100));
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
    DECLARE totalRetenciones int default 0;
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
    IF (Select sum(retencion) from retencion_salarial
		where activo = true and empleado_id = _id
		and year(fecha) = _anio and month(fecha) = _mes) <> 0 then
			Set totalRetenciones = (Select sum(retencion) from retencion_salarial
				where activo = true
                and empleado_id = _id
                and year(fecha) = _anio
                and month(fecha) = _mes);
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
    IF (Select sum(retencion) from retencion_salarial
		where activo = true and empleado_id = _id
		and year(fecha) = _anio and month(fecha) = _mes) <> 0 then
			Set totalRetenciones = (Select sum(retencion) from retencion_salarial
				where activo = true
                and empleado_id = _id
                and year(fecha) = _anio
                and month(fecha) = _mes);
	end if; 
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
	set total = (salarioAnual + auxBonos + (hora * auxHorasExtra * 1.5)- 2 * totalRetenciones);
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
	DECLARE resultado int default 0;
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
    set resultado =  (neto + ccss_obrero);
    RETURN resultado;
END$$

DELIMITER ;

select * from bonos where empleado_id = 3

select * from empleados

-- SALARIO SIN REBAJAS
select salarioBrutoEmpleado(5, '01', '2020');
-- SALARIO CON EXTRAS
select salarioNetoEmpleado(5, '03', '2020');
-- AGUINALDO
select salarioAguinaldo(5, '01', '2020');
-- PAGO DEL MES 
select salarioEmpleado(3, '01', '2020');

select year(fecha_contrato) from empleados where id = 5;
select substr(now(), 1, 4) as fecha;
-- + (totalHorasExtra * (totalSalarioHora * 1.5)) + (hora*totalPermisos)*-1) 

select empleado_id, id, fecha_salida, fecha_entrada , motivo from incapacidades where empleado_id = 3

select * from permisos 