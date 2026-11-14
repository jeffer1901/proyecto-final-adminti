# Documentación Técnica — Infraestructura de Servicios Droguería Farmadrogas

**Curso:** Administración de Infraestructura de TI — Universidad del Quindío
**Profesor:** Maycol Cárdenas Acevedo
**Estudiante:** Jefferson Rubio Rincón
**Empresa:** Droguería Farmadrogas — Armenia, Quindío

| Semana | Contenido | Estado |
|---|---|---|
| 1 | Análisis y diseño → [`analisis.md`](analisis.md), [`diagrama.mmd`](diagrama.mmd) | ✅ |
| 2 | Infraestructura base: VM, IP fija, NTP, Dokploy, DNS, SSL | ✅ |
| 3 | Servicios — Parte A: Web + PostgreSQL | ✅ |
| 3 | Servicios — Parte B y C: NFS, NIS, CUPS, Samba | ⏳ |
| 4 | Documentación final y presentación | ⏳ |

---

# Semana 2 — Infraestructura Base

## Resumen del entorno

| Elemento | Valor |
|---|---|
| Hipervisor | Oracle VirtualBox |
| Máquina virtual | `srv-farmadrogas` |
| Sistema operativo | Ubuntu 26.04.1 LTS (kernel 7.0) |
| Recursos | 2 vCPU, 8 GB RAM, 40 GB disco |
| Red | Adaptador puente, IP estática `192.168.1.10/24`, gateway `192.168.1.1` |
| Usuario administrador | `jeffer` |
| Zona horaria | America/Bogota (UTC−5) |
| Servidor de hora | NTPsec (puerto 123/UDP) |
| Plataforma PaaS | Dokploy + Traefik v3.6 (Docker Swarm) |
| Dominio | `farmadrogas.192.168.1.10.sslip.io` |
| SSL/TLS | Certificado autofirmado de Traefik, TLS 1.3 |

> **Nota sobre la versión:** el proyecto sugiere Ubuntu 22.04/24.04. Se usó **Ubuntu 26.04.1 LTS**, la versión LTS más reciente (soporte hasta 2031), compatible con todos los servicios requeridos. La VM se configuró con 8 GB de RAM (el mínimo es 4 GB) para que Dokploy y los servicios de la semana 3 corran con holgura.

---

## 1. Red del equipo anfitrión

Se identificó la red local para elegir una IP libre para el servidor: red `192.168.1.0/24`, puerta de enlace `192.168.1.1`.

```cmd
ipconfig
```

![Captura 1 — ipconfig del equipo anfitrión](capturas/semana2/01-ipconfig.png)

---

## 2. Creación de la máquina virtual

Se creó la VM `srv-farmadrogas` en VirtualBox con el adaptador de red en **modo puente**, para que el servidor quede en la misma red que los equipos de la droguería.

![Captura 2 — Configuración de sistema de la VM](capturas/semana2/02-vm-resumen.png)

![Captura 3 — Adaptador de red en modo puente](capturas/semana2/03-vm-red-puente.png)

---

## 3. Instalación del sistema operativo

Se instaló Ubuntu 26.04.1 LTS con nombre de equipo `srv-farmadrogas`, usuario `jeffer` y servidor OpenSSH.

```bash
hostnamectl
lsb_release -a
```

![Captura 4 — hostnamectl y lsb_release](capturas/semana2/04-ubuntu-instalado.png)

---

## 4. IP estática

Se desactivó la configuración de red de cloud-init y se creó el archivo de Netplan con IP fija. Archivo completo: [`codigo/semana2/01-farmadrogas.yaml`](codigo/semana2/01-farmadrogas.yaml).

```bash
echo 'network: {config: disabled}' | sudo tee /etc/cloud/cloud.cfg.d/99-disable-network-config.cfg
sudo nano /etc/netplan/01-farmadrogas.yaml
```

```yaml
network:
  version: 2
  ethernets:
    enp0s3:
      dhcp4: false
      addresses:
        - 192.168.1.10/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses: [8.8.8.8, 1.1.1.1]
```

```bash
sudo chmod 600 /etc/netplan/01-farmadrogas.yaml
sudo netplan apply
ip -br a
ping -c 3 google.com
```

**Resultado:** `enp0s3` con `192.168.1.10/24` y salida a Internet (3 paquetes enviados, 3 recibidos, 0 % pérdida).

![Captura 6 — IP estática aplicada y prueba de conectividad](capturas/semana2/06-ip-fija.png)

A partir de aquí la administración se hizo **por SSH** desde Windows (`ssh jeffer@192.168.1.10`), como se ve en las ventanas de terminal de las siguientes capturas.

---

## 5. Actualización y zona horaria

```bash
sudo apt update && sudo apt upgrade -y
sudo timedatectl set-timezone America/Bogota
timedatectl
```

**Resultado:** `Time zone: America/Bogota (-05, -0500)`, `System clock synchronized: yes`.

![Captura 8 — Actualización del sistema y zona horaria](capturas/semana2/08-zona-horaria.png)

---

## 6. Servicio NTP (servidor de hora)

**Objetivo para Farmadrogas:** que los PCs de caja, el equipo de administración y el grabador de cámaras tengan la misma hora (facturas, cierres de caja y grabaciones con hora correcta).

En Ubuntu 26.04 el servidor NTP es **NTPsec** (sucesor del paquete `ntp`); al instalarlo reemplaza a `systemd-timesyncd`.

```bash
sudo apt install ntpsec -y
sudo cp /etc/ntpsec/ntp.conf /etc/ntpsec/ntp.conf.bak
sudo nano /etc/ntpsec/ntp.conf
```

Se comentaron las líneas `pool` originales y se agregó al final ([`codigo/semana2/ntp-farmadrogas.conf`](codigo/semana2/ntp-farmadrogas.conf)):

```conf
server 0.co.pool.ntp.org iburst
server 1.co.pool.ntp.org iburst
server 0.south-america.pool.ntp.org iburst
pool pool.ntp.org iburst

restrict 192.168.1.0 mask 255.255.255.0 nomodify notrap nopeer
```

```bash
sudo systemctl restart ntpsec
sudo systemctl enable ntpsec
systemctl status ntpsec --no-pager
```

![Captura 10 — Servicio ntpsec activo](capturas/semana2/10-ntp-status.png)

### Verificación en el servidor

```bash
ntpq -p
sudo ss -ulpn | grep :123
```

**Resultado:** `ntpq -p` muestra la fuente `0.co.pool.ntp.org` marcada con `*` (sincronizado) y `ntpd` escucha en `192.168.1.10:123/UDP`.

![Captura 11 — ntpq -p y puerto 123/UDP](capturas/semana2/11-ntpq.png)

### Verificación desde un cliente Windows

```cmd
w32tm /stripchart /computer:192.168.1.10 /samples:5 /dataonly
```

**Resultado:** el PC Windows consulta la hora al servidor de la droguería y recibe 5 muestras (diferencia ≈ −0,37 s, que es lo que el cliente se corregiría al sincronizar).

![Captura 12 — Cliente Windows consultando el servidor NTP](capturas/semana2/12-ntp-cliente-windows.png)

---

## 7. Instalación de Dokploy

```bash
sudo ss -tulpn | grep -E ':(80|443|3000)\s'   # verificar puertos libres
curl -sSL https://dokploy.com/install.sh | sudo sh
```

El instalador configuró Docker en modo Swarm, la red interna, Traefik y Dokploy, y terminó con *"Congratulations, Dokploy is installed!"*.

![Captura 13 — Dokploy instalado](capturas/semana2/13-dokploy-instalado.png)

```bash
sudo docker ps
```

![Captura 14 — Contenedores de Dokploy en ejecución](capturas/semana2/14-docker-ps.png)

Se creó la cuenta de administrador en `http://192.168.1.10:3000`:

![Captura 15 — Panel de Dokploy](capturas/semana2/15-dokploy-panel.png)

---

## 8. Dominio / DNS

Se usó **sslip.io**, un DNS gratuito en el que cualquier nombre que contiene una IP resuelve a esa IP, sin registrar dominio ni montar un servidor DNS propio.

**Dominio:** `farmadrogas.192.168.1.10.sslip.io`

```cmd
nslookup farmadrogas.192.168.1.10.sslip.io
```

**Resultado:** `Address: 192.168.1.10`.

![Captura 16 — Resolución DNS del dominio](capturas/semana2/16-dns-sslip.png)

---

## 9. Aplicación en Dokploy con HTTPS

Para la demostración de la semana 2 se desplegó una aplicación de prueba con Nginx. En la semana 3 se reemplaza por la web de Farmadrogas.

1. **Projects → Create Project:** `Farmadrogas`.
2. **Create Service → Application:** `web-prueba`.

![Captura 17 — Proyecto Farmadrogas con la aplicación web-prueba](capturas/semana2/17-dokploy-proyecto.png)

3. **Provider:** Docker, imagen `nginx:alpine` → **Deploy**.

![Captura 18 — Despliegue completado (Done)](capturas/semana2/18-deploy-ok.png)

4. **Domains → Add Domain:** host `farmadrogas.192.168.1.10.sslip.io`, path `/`, puerto `80`, **HTTPS activado**, certificado `None` (Traefik genera uno autofirmado).

![Captura 19 — Dominio con HTTPS configurado](capturas/semana2/19-dominio-https.png)

**¿Por qué certificado autofirmado?** Let's Encrypt necesita entrar desde Internet al servidor para validar el dominio. El servidor de Farmadrogas es **local** y no está expuesto a Internet, así que se usa un certificado autofirmado, que cifra igual el tráfico (opción permitida por el proyecto).

### Verificación

Sitio abierto por HTTPS en el navegador:

![Captura 20 — Sitio accesible por HTTPS](capturas/semana2/20-https-nginx.png)

Detalles del certificado (`CN=TRAEFIK DEFAULT CERT`, válido del 12/11/2026 al 12/11/2027):

![Captura 21 — Certificado TLS](capturas/semana2/21-certificado.png)

```bash
getent hosts farmadrogas.192.168.1.10.sslip.io
curl -I http://farmadrogas.192.168.1.10.sslip.io
curl -vkI https://farmadrogas.192.168.1.10.sslip.io 2>&1 | grep -E 'SSL connection|subject|issuer|HTTP/'
```

**Resultado:**
- HTTP responde `308 Permanent Redirect` hacia `https://` (redirección forzada a HTTPS).
- Conexión cifrada con **TLSv1.3** (`TLS_AES_128_GCM_SHA256`).
- Respuesta `HTTP/2 200`.

![Captura 22 — Verificación de redirección y TLS con curl](capturas/semana2/22-curl-tls.png)

---

## 10. Instantánea de la VM

Se tomó la instantánea `semana2-base-ok` en VirtualBox como punto de restauración antes de la semana 3.

![Captura 23 — Instantánea semana2-base-ok](capturas/semana2/23-snapshot.png)

---

## 11. Verificación del Entregable 2

| Requisito | Evidencia | Estado |
|---|---|---|
| VM Ubuntu en VirtualBox, ≥ 2 vCPU, ≥ 4 GB RAM, 40 GB, modo puente | Capturas 2, 3, 4 | ✅ |
| IP estática | Captura 6 | ✅ |
| Servicio NTP configurado y sincronizado | Capturas 10, 11 | ✅ |
| Clientes obtienen la hora del servidor | Captura 12 | ✅ |
| Dokploy instalado y accesible | Capturas 13, 14, 15 | ✅ |
| Dominio/DNS configurado | Capturas 16, 22 | ✅ |
| SSL/TLS configurado | Capturas 19, 20, 21, 22 | ✅ |

## 12. Problemas encontrados y soluciones

| Problema | Causa | Solución |
|---|---|---|
| La VM funcionaba muy lento (ícono de tortuga en VirtualBox) | Windows tenía activo el hipervisor de Hyper-V (usado por WSL/Podman) y VirtualBox corría encima de él | Desactivar *Integridad de memoria* y ejecutar `bcdedit /set hypervisorlaunchtype off`, luego reiniciar. Se revierte con `bcdedit /set hypervisorlaunchtype auto` |
| No se puede copiar y pegar en la consola de la VM | La consola de VirtualBox no comparte el portapapeles en modo texto | Administrar el servidor por SSH desde Windows |
| SSH mostró `REMOTE HOST IDENTIFICATION HAS CHANGED` | Esa IP la había usado antes otra VM y Windows tenía guardada su huella | `ssh-keygen -R <IP>` y volver a conectar |
| Se perdió la conexión SSH al aplicar la IP fija | La IP del servidor cambió de la asignada por DHCP a `192.168.1.10` | Reconectar con `ssh jeffer@192.168.1.10` |
| Dokploy muestra *"Domain resolves to 192.168.1.10 but should point to 152.202.10.21…"* | Dokploy compara el DNS con la IP pública porque asume un servidor expuesto a Internet (para Let's Encrypt) | Es solo una advertencia: el servidor es local por diseño, Traefik enruta por nombre de host y el sitio funciona por HTTPS |

---

# Semana 3 — Parte A: Web de Farmadrogas + Base de datos PostgreSQL

## Arquitectura

```
Navegador ──HTTPS──► Traefik ──► web-farmadrogas (Node.js, puerto 3000) ──► farmadrogas-db (PostgreSQL)
                    (Dokploy)        código desde GitHub                         red interna de Docker
```

| Componente | Detalle |
|---|---|
| Aplicación | `web-farmadrogas` — Node.js 22 + Express, imagen construida con [`Dockerfile`](codigo/web-farmadrogas/Dockerfile) |
| Código | [`codigo/web-farmadrogas/`](codigo/web-farmadrogas/) en este repositorio |
| Base de datos | `farmadrogas-db` — PostgreSQL 18 creado desde Dokploy |
| Esquema | [`sql/init.sql`](codigo/web-farmadrogas/sql/init.sql): tablas `categorias`, `productos`, `mensajes` |
| Dominio | `https://farmadrogas.192.168.1.10.sslip.io` → contenedor puerto 3000 |

**Funciones de la web:** información de la droguería (servicios, horario, ubicación), **catálogo con buscador y filtro por categoría** leído desde PostgreSQL, formulario de contacto que guarda en la base de datos, panel `/admin.html` protegido con clave para agregar productos, y endpoint `/api/estado` que verifica la conexión con la base.

**Decisión de diseño:** el puerto 5432 de PostgreSQL **no se expone** a la red local. Solo la aplicación accede a la base por la red interna de Docker, así ningún equipo de la droguería puede conectarse directamente a ella.

---

## 1. Código en GitHub

El código de la web se subió a este repositorio; Dokploy lo descarga desde aquí para construir la imagen.

```powershell
git add .
git commit -m "Semana 3A: web de Farmadrogas con PostgreSQL"
git push
```

![S3A-01 — Repositorio en GitHub](capturas/semana3/s3a-01-github.png)

---

## 2. Base de datos PostgreSQL en Dokploy

Proyecto **Farmadrogas** → **Create Service** → **Database** → **PostgreSQL**:

| Campo | Valor |
|---|---|
| Name | `farmadrogas-db` |
| Database Name | `farmadrogas` |
| Database User | `farmadrogas` |
| Password | (definida por el administrador) |

Se desplegó con **Deploy** y se copió la **Internal Connection URL** de *Internal Credentials* para conectar la aplicación.

![S3A-02 — Base de datos farmadrogas-db desplegada y sus credenciales internas](capturas/semana3/s3a-02-db-creada.png)

---

## 3. Aplicación web en Dokploy

1. Se quitó el dominio a la aplicación de prueba `web-prueba` (nginx) y se detuvo.
2. **Create Service → Application:** `web-farmadrogas`.
3. **Provider:** GitHub, repositorio `proyecto-final-adminti`, rama `main`, **Build Path** `/codigo/web-farmadrogas`, despliegue automático *On Push*. **Build Type:** Dockerfile.

![S3A-04 — Origen del código y ruta de construcción](capturas/semana3/s3a-04-provider.png)

4. **Environment:**

```
DATABASE_URL=postgresql://farmadrogas:********@<host-interno-de-farmadrogas-db>:5432/farmadrogas
ADMIN_KEY=********
```

5. **Deploy.** Al arrancar, la aplicación crea las tablas y carga los productos iniciales:

```
Datos iniciales cargados: 16 productos
Web Farmadrogas escuchando en el puerto 3000
```

![S3A-06 — Logs de la aplicación: datos cargados y servidor escuchando](capturas/semana3/s3a-06-logs-app.png)

---

## 4. Dominio con HTTPS

**Domains → Add Domain:** host `farmadrogas.192.168.1.10.sslip.io`, path `/`, **container port 3000**, HTTPS activado, certificado autofirmado (*None*).

![S3A-08 — Dominio de la aplicación con HTTPS y puerto 3000](capturas/semana3/s3a-08-dominio.png)

---

## 5. Pruebas

### 5.1 Sitio accesible por HTTPS

![S3A-09 — Página de inicio de Farmadrogas por HTTPS](capturas/semana3/s3a-09-sitio-inicio.png)

### 5.2 Catálogo leído desde PostgreSQL

![S3A-10 — Catálogo de productos con precios y disponibilidad](capturas/semana3/s3a-10-catalogo.png)

### 5.3 Escritura en la base de datos desde la web

Desde `/admin.html` se agregó el producto **Diclofenaco 50 mg**; la base le asignó el **id 17**.

![S3A-11 — Producto guardado desde el panel de administración](capturas/semana3/s3a-11-admin-guardado.png)

El producto nuevo aparece de inmediato en el buscador del catálogo:

![S3A-12 — Búsqueda "diclo" mostrando el producto nuevo](capturas/semana3/s3a-12-producto-nuevo.png)

### 5.4 Estado de la conexión (`/api/estado`)

Responde `"base_de_datos": "conectada"`, la versión de PostgreSQL, el nombre de la base y `"productos": 17`.

![S3A-13 — Endpoint /api/estado](capturas/semana3/s3a-13-api-estado.png)

### 5.5 Verificación directa en PostgreSQL

Desde el servidor, entrando al contenedor de la base:

```bash
DB=$(sudo docker ps --format "{{.Names}} {{.Image}}" | grep -i postgres | grep -v '^dokploy-postgres' | awk '{print $1}' | head -n1)
sudo docker exec -it $DB psql -U farmadrogas -d farmadrogas -c "\dt"
sudo docker exec -it $DB psql -U farmadrogas -d farmadrogas -c "SELECT id, nombre, precio, stock FROM productos ORDER BY id DESC LIMIT 5;"
sudo docker exec -it $DB psql -U farmadrogas -d farmadrogas -c "SELECT nombre, mensaje, creado_en FROM mensajes;"
```

**Resultado:** existen las 3 tablas (`categorias`, `mensajes`, `productos`) con dueño `farmadrogas`, y el último registro de `productos` es el **Diclofenaco 50 mg (id 17)** creado desde la web, lo que confirma que la aplicación escribe en la base de datos.

![S3A-14 — Tablas y registros consultados con psql](capturas/semana3/s3a-14-psql.png)

### 5.6 Servicios del proyecto en Dokploy

![S3A-17 — Proyecto Farmadrogas con web-farmadrogas y farmadrogas-db](capturas/semana3/s3a-17-proyecto-dokploy.png)

---

## 6. Verificación (Parte A)

| Requisito | Evidencia | Estado |
|---|---|---|
| App desplegada en Dokploy desde Git | S3A-04, S3A-06 | ✅ |
| Sitio accesible por HTTPS con contenido de la empresa | S3A-09, S3A-10 | ✅ |
| Base de datos PostgreSQL creada vía Dokploy | S3A-02 | ✅ |
| Base de datos conectada a la app (lectura y escritura) | S3A-10 a S3A-14 | ✅ |

## 7. Problemas encontrados y soluciones

| Problema | Causa | Solución |
|---|---|---|
| `git push` rechazado (*fetch first*) | El repositorio en GitHub ya tenía contenido que no estaba en el equipo local | `git pull origin main --allow-unrelated-histories --no-rebase -X ours` y luego `git push` |
| `docker exec` respondía *No such container* | Dokploy nombra el contenedor de la base con un prefijo y un sufijo aleatorio, así que el filtro `name=farmadrogas-db` no lo encontraba | Buscar el contenedor por imagen `postgres`, excluyendo la base interna de Dokploy |
| Dokploy muestra la advertencia de dominio de la semana 2 | El dominio apunta a la IP local, no a la IP pública | Advertencia esperada en un servidor local; el sitio funciona por HTTPS |
