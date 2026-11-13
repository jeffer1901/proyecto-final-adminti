# Proyecto Final — Infraestructura de Servicios para la Droguería Farmadrogas

Proyecto final del curso **Administración de Infraestructura de TI** (Universidad del Quindío, Ingeniería de Sistemas y Computación).

**Estudiante:** Jefferson Rubio Rincón — [@jeffer1901](https://github.com/jeffer1901)
**Profesor:** Maycol Cárdenas Acevedo

## Descripción

Como consultor de infraestructura TI se diseña e implementa, en un servidor local, la infraestructura de servicios de la **Droguería Farmadrogas** (Armenia, Quindío): web institucional con base de datos sobre **Dokploy**, y servicios Linux de hora (NTP), archivos (NFS y Samba), autenticación (NIS) e impresión (CUPS). El sistema de facturación actual (Dominium Plus) no se modifica.

## Servidor

| | |
|---|---|
| Nombre | `srv-farmadrogas` |
| IP | `192.168.1.10/24` |
| SO | Ubuntu 26.04.1 LTS (VirtualBox, 2 vCPU, 8 GB RAM, 40 GB) |
| Panel Dokploy | `http://192.168.1.10:3000` |
| Sitio web | `https://farmadrogas.192.168.1.10.sslip.io` |

## Estado

| Semana | Entregable | Estado |
|---|---|---|
| 1 | Análisis y diagrama | ✅ |
| 2 | Dokploy + NTP + DNS + SSL | ✅ |
| 3 | Web + PostgreSQL ✅ · NFS, NIS, CUPS, Samba ⏳ | 🔄 |
| 4 | Documentación final y presentación | ⏳ |

## Estructura

```
proyecto-final/
├── analisis.md        # Análisis de necesidades y diseño
├── diagrama.mmd       # Diagrama de arquitectura (Mermaid)
├── documentacion.md   # Documentación técnica con capturas
├── README.md
├── capturas/          # Evidencias por semana
│   └── semana2/
└── codigo/            # Código y archivos de configuración
    ├── web-farmadrogas/   # Web de la droguería (Node.js + Express + PostgreSQL, Dockerfile para Dokploy)
    └── semana2/
        ├── 01-farmadrogas.yaml     # Netplan (IP estática)
        └── ntp-farmadrogas.conf    # Configuración NTPsec
```
