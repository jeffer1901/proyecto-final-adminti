#!/bin/bash
# Creación del grupo y los usuarios de Farmadrogas en el servidor NIS (srv-farmadrogas)
set -e
groupadd -g 2000 farmadrogas
mkdir -p /srv/nfs/home
for u in rocio alirio daniel; do
  useradd -m -d /srv/nfs/home/$u -s /bin/bash -G farmadrogas $u
  echo "$u:Farma2026" | chpasswd
done
chfn -f "Rocio - Propietaria" rocio
chfn -f "Alirio - Caja" alirio
chfn -f "Daniel - Caja" daniel
# Carpetas compartidas de la droguería: solo el grupo farmadrogas, setgid
mkdir -p /srv/nfs/farmadrogas/{Reportes,Proveedores,Respaldos}
chown -R root:farmadrogas /srv/nfs/farmadrogas
chmod -R 2770 /srv/nfs/farmadrogas
# Actualizar mapas NIS
cd /var/yp && make
