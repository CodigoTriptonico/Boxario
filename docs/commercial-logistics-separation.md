# Separación comercial / logística

Documento de referencia de la configuración comercial heredable (migración `094_commercial_configuration_inheritance.sql`) y su frontera con operación logística.

## Precedencia de precios

Orden de resolución comercial:

1. **Excepción individual** (entidad)
2. **Excepción general** (grupo)
3. **Base del país**

La UI de administración comercial debe hacer legible esa herencia y permitir volver a heredar sin mezclar saldos ni cobros.

## Instantáneas y hechos históricos

Las ventas y cargos conservan **Fotografías históricas de precio**. Cambiar la configuración comercial vigente **no elimina ni reescribe hechos financieros históricos**.

## Frontera con logística

- Logística opera movimientos físicos (oficina de agencia / cliente de agencia).
- El conductor solo registra movimientos físicos; no administra precios públicos ni cobros comerciales desde esa superficie.
- La extensión geográfica futura de precios usa `calculation_rule` (punto de extensión, p. ej. `{"type":"fixed"}`).
