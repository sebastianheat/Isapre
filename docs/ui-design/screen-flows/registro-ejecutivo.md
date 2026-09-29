# Screen Flow: Registro de Ejecutivo Externo

**Epic:** 1 (Autenticación y Roles), 10 (Cláusula de tratamiento de datos)
**Persona objetivo:** Rodrigo (primaria)
**Dispositivo primario:** Mobile-first

```
/registro (form) ──[enviar]──▶ "Revisa tu correo" (con link al cotizador gratis)
        │
        └──[clic en link de verificación del email]──▶ "Cuenta verificada, en espera de aprobación"
                    │
                    └──(Cynthia aprueba, US-003)──▶ Email de bienvenida ──▶ /login → /panel
```

---

### Pantalla: `/registro`

**Entry from:** Landing `/ejecutivos` (fase posterior) o link directo compartido
**Story refs:** US-001, US-044

#### Layout
Formulario de una columna, mobile-first: nombre, email, teléfono/WhatsApp, RUT, isapre(s) que representa, código de agente (opcional), checkbox de términos.

#### Data Displayed
| Elemento | Fuente | Formato |
|----------|--------|---------|
| Cláusula de tratamiento de datos | Texto legal versionado | Checkbox obligatorio + link a términos completos |

#### Actions
| Acción | Control | Resultado |
|--------|---------|-----------|
| Enviar registro | Botón "Crear cuenta" (deshabilitado hasta aceptar términos) | Crea usuario `pendiente_aprobacion`, envía email de verificación (US-001, US-044) |

#### States
- **Validación:** RUT inválido → "El RUT ingresado no es válido"; email duplicado → "Ya existe una cuenta con este correo. ¿Olvidaste tu contraseña?"
- **Success:** transición a pantalla "Revisa tu correo" con link "Mientras esperamos, prueba el cotizador gratis →" (ver `docs/ux-design/onboarding.md`).

---

### Pantalla: "Revisa tu correo" / "Cuenta verificada, en espera de aprobación"

**Entry from:** Envío exitoso de `/registro`; clic en el link de verificación
**Story refs:** US-002

#### Actions
| Acción | Control | Resultado |
|--------|---------|-----------|
| Reenviar verificación | Link "¿No llegó el correo?" | Reenvía el email si el link original expiró |
| Probar el cotizador | Link destacado | Navega a `/cotizador` público, sin necesitar aprobación |

#### States
- **Link expirado:** "Este link venció, solicita uno nuevo" + botón de reenvío.
- **Link ya usado:** mensaje neutro, redirige a `/login`.

---

## Component Selection

Ningún componente nuevo — reutiliza `Input`, `Checkbox`, `Button` de shadcn/ui.

---

## Acceptance Targets: Registro de Ejecutivo

- [ ] El botón "Crear cuenta" debe estar deshabilitado hasta que se acepte la cláusula de tratamiento de datos
- [ ] Un RUT inválido debe mostrar "El RUT ingresado no es válido" sin perder los demás datos ingresados
- [ ] Tras enviar, debo ver la pantalla "Revisa tu correo" con un link al cotizador gratis
- [ ] Un link de verificación expirado debe permitir reenviar uno nuevo
