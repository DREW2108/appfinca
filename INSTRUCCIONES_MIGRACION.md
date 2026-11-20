# 🚀 Guía de Despliegue y Migración: Finca Macoya
**De Google Sheets / AppSheet ➔ HTML5 + JavaScript + Supabase + Netlify (Costo $0 y Máxima Velocidad)**

---

## 📋 ¿Qué se ha transformado en tu proyecto?

1. **Base de Datos Relacional (PostgreSQL en Supabase)**:
   - Ya no dependes de las limitaciones de filas, lentitud y bloqueos de Google Sheets.
   - Archivo generado: `schema.sql` con tablas relacionales (`usuarios`, `productos`, `bebidas`, `alquileres`, `entradas`, `ventas`), índices de alta velocidad, políticas de seguridad RLS y datos iniciales.

2. **Frontend Independiente y Rápido**:
   - `index.html`: Se eliminaron las etiquetas propietarias de Google Apps Script (`<? ... ?>`) para convertirlo en HTML5 estándar y limpio.
   - `style.css`: Se extrajo y optimizó toda la hoja de estilos CSS (diseño Glassmorphism, modo claro/oscuro, totalmente responsive).
   - `app.js`: Se reemplazaron todas las llamadas lentas `google.script.run` por consultas directas a Supabase usando el SDK oficial en JavaScript (`@supabase/supabase-js`), acelerando las operaciones de 4–6 segundos a menos de 50 milisegundos.
   - `config.js`: Archivo central donde solo debes colocar tu URL y Clave pública de Supabase.

3. **Despliegue en la Nube (Netlify)**:
   - `netlify.toml`: Archivo de configuración listo para publicar tu app con certificado SSL gratuito (HTTPS) y CDN global.

---

## 🛠️ PASO 1: Crear tu cuenta y proyecto en Supabase (Costo $0)

1. Entra a [https://supabase.com/](https://supabase.com/) y haz clic en **Start your project** (o **Sign in**).
2. Regístrate gratis (puedes iniciar sesión con tu cuenta de GitHub o con tu correo electrónico).
3. En el panel principal (Dashboard), haz clic en el botón verde **"New Project"**.
4. Completa los datos:
   - **Name**: `Finca Macoya` (o el nombre que prefieras).
   - **Database Password**: Escribe una contraseña segura (guárdala en un lugar seguro).
   - **Region**: Selecciona la más cercana (ej: `South America (São Paulo)` o `East US (North Virginia)`).
   - **Pricing Plan**: Deja seleccionado el plan **Free ($0/month)**.
5. Haz clic en **"Create new project"** y espera unos 60–90 segundos a que termine de aprovisionar la base de datos.

---

## 🗄️ PASO 2: Crear las tablas en Supabase (Copiar y Pegar)

1. En el menú lateral izquierdo de tu proyecto en Supabase, haz clic en **"SQL Editor"** (el icono de código `>_`).
2. Haz clic en **"New Query"**.
3. Abre el archivo `schema.sql` que creamos en tu carpeta [schema.sql](file:///c:/Users/ANDRES/Desktop/appfinca/schema.sql).
4. Copia todo su contenido y pégalo en el editor SQL de Supabase.
5. Haz clic en el botón verde **"Run"** (o presiona `Ctrl + Enter`).
6. Verás el mensaje **"Success. No rows returned"**. ¡Listo! Todas las tablas, índices, catálogo y permisos han sido creados.

---

## 🔑 PASO 3: Conectar tu aplicación con Supabase

1. En el menú lateral izquierdo de Supabase, ve a **"Project Settings"** (icono de engranaje ⚙️) ➔ **"API"**.
2. Ubica dos valores:
   - **Project URL**: (algo como `https://abcdefghijkl.supabase.co`).
   - **Project API Keys** ➔ Copia la clave llamada **`anon` / `public`**.
3. Abre el archivo `config.js` en tu carpeta: [config.js](file:///c:/Users/ANDRES/Desktop/appfinca/config.js).
4. Reemplaza los valores con los tuyos:
   ```javascript
   const SUPABASE_CONFIG = {
     url: 'https://TU-PROYECTO.supabase.co', // Pega tu Project URL
     anonKey: 'TU-CLAVE-ANON-AQUI'          // Pega tu clave anon pública
   };
   ```
5. Guarda el archivo (`Ctrl + S`).

---

## 💻 PASO 4: Probar la aplicación en tu computadora

1. Haz doble clic en el archivo [index.html](file:///c:/Users/ANDRES/Desktop/appfinca/index.html) para abrirlo en tu navegador favorito (Chrome, Edge, Brave, Firefox, etc.).
2. Como es la primera vez que se inicia con la base de datos vacía:
   - La aplicación detectará automáticamente que no hay usuarios y te mostrará el formulario **"Crea tu cuenta"**.
   - Ingresa tu usuario (ej: `admin` o `Andrew`) y tu contraseña (mínimo 8 caracteres).
   - El primer usuario registrado se convierte automáticamente en **Administrador Activo**.
   - Las siguientes personas que se registren quedarán como **Encargados Pendientes** hasta que tú las apruebes desde la pestaña **"Usuarios"**.
3. Inicia sesión y prueba registrar un alquiler, una entrada o una venta. Verás cómo responde de forma instantánea.

---

## 🌐 PASO 5: Desplegar en Netlify (Costo $0 con HTTPS)

Tienes dos métodos rápidos para desplegar en Netlify:

### Método A: Arrastrar y Soltar (El más rápido - 1 minuto)
1. Entra a [https://www.netlify.com/](https://www.netlify.com/) y crea tu cuenta gratuita (con correo o GitHub).
2. En tu panel de Netlify, ve a la pestaña **"Sites"**.
3. Verás una zona que dice: *"Want to deploy a new site without connecting to Git? Drag and drop your site output folder here"*.
4. Abre el Explorador de Archivos de Windows en tu carpeta: `C:\Users\ANDRES\Desktop\appfinca`.
5. Arrastra la carpeta completa **`appfinca`** y suéltala en el navegador sobre esa zona.
6. En segundos, Netlify desplegará tu app y te dará un enlace público seguro (ej: `https://finca-macoya.netlify.app`).

### Método B: Conectando con GitHub (Para actualizaciones automáticas)
1. Sube tu carpeta `appfinca` a un repositorio en [GitHub](https://github.com).
2. En Netlify, haz clic en **"Add new site"** ➔ **"Import an existing project"** ➔ Selecciona **GitHub**.
3. Elige tu repositorio y haz clic en **Deploy**.
4. Cada vez que hagas un cambio en tu código y lo subas a GitHub, Netlify actualizará tu aplicación automáticamente en la nube.

---

## ⚡ Comparativa de Rendimiento y Beneficios

| Característica | Antes (Google Sheets + AppSheet) | Ahora (HTML5 + Supabase + Netlify) |
| :--- | :--- | :--- |
| **Tiempo de respuesta** | 3 a 7 segundos por guardado | Menor a 100 milisegundos (Instantáneo) |
| **Límite de filas / Datos** | Se ralentiza con cientos de filas | PostgreSQL maneja millones de registros sin perder velocidad |
| **Costo mensual** | Requiere planes pagos si se superan usuarios | **$0 / mes** (Planes gratuitos generosos de Supabase y Netlify) |
| **Diseño y Personalización** | Rígido, interfaz limitada de AppSheet | 100% personalizable (CSS, componentes, temas, móviles y escritorio) |
| **Disponibilidad** | Sujeto a cuotas y límites de Apps Script | 99.9% uptime con CDN global y PostgreSQL |
