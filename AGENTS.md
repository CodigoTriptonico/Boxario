# Instrucciones del proyecto Boxario

## Antes de modificar el proyecto

- Leer `docs/REGLAS_NEGOCIO_Y_DEPENDENCIAS.md` antes de cambiar lógica de negocio, datos o flujos entre módulos.
- Leer `docs/GUIA_ESTILO_UI.md` antes de cambiar la interfaz, modales, formularios o interacción.
- Buscar primero la fuente de verdad existente y conservar la arquitectura, permisos y auditoría del proyecto.
- No inventar datos ni relajar validaciones de seguridad para ocultar un problema operativo.

## Registro obligatorio de decisiones

Cuando el usuario aclare cómo debe funcionar una pantalla, una regla de negocio o una interacción, registrar la decisión en el documento correspondiente:

- Reglas de negocio, dependencias, estados y efectos en datos: `docs/REGLAS_NEGOCIO_Y_DEPENDENCIAS.md`.
- Apariencia, mensajes, advertencias, accesibilidad y comportamiento de interfaz: `docs/GUIA_ESTILO_UI.md`.
- Compatibilidad, despliegue local, red, autenticación y decisiones técnicas transversales: `docs/DECISIONES_TECNICAS_Y_COMPATIBILIDAD.md`.

Agregar una nota breve con fecha, contexto, decisión y resultado. No registrar cada cambio mecánico; registrar únicamente decisiones que deban conservarse para futuras modificaciones.

## Preferencias rechazadas de interfaz

Si el usuario dice que no le gusta una interfaz, un estilo, un mensaje o una interaccion y pide cambiarlo:

- Registrar en `docs/GUIA_ESTILO_UI.md` que se rechazo, por que y que alternativa se adopto.
- Tratar esa nota como una preferencia permanente para nuevas pantallas y redisenos.
- Revisar primero esas preferencias antes de proponer una interfaz similar.
- No volver a introducir el patron rechazado salvo que el usuario lo pida expresamente.

Usar este formato:

```md
### FECHA - Preferencia UI: nombre breve

**No repetir:** patron o decision que el usuario rechazo.

**Motivo:** que problema causo o que no le gusto.

**Preferir:** alternativa aprobada.
```

## Densidad de páginas

- No crear encabezados introductorios permanentes de página.
- Mantener una sola superficie principal y usar divisores para agrupar contenido; evitar cajas anidadas que repitan jerarquía o información.
- Cuando una explicación secundaria sea necesaria, usar el patrón compartido `CompactInfoDisclosure`.
- En pasos móviles, priorizar el nombre corto del paso. Los datos largos, como teléfonos y países, deben quedar fuera de la barra compacta y mostrarse donde tengan espacio legible.

## Entrega

- Mencionar en la respuesta final qué documento se actualizó cuando una decisión quedó documentada.
- Ejecutar las pruebas y la compilación proporcionales al cambio.
- Preservar cambios existentes del usuario que no estén relacionados con la tarea.
