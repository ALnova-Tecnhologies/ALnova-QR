const qrText = document.getElementById("qrText");
const qrColor = document.getElementById("qrColor");
const bgColor = document.getElementById("bgColor");
const qrSize = document.getElementById("qrSize");
const qrShape = document.getElementById("qrShape");
const finderShape = document.getElementById("finderShape");
const qrMargin = document.getElementById("qrMargin");
const sizeValue = document.getElementById("sizeValue");
const marginValue = document.getElementById("marginValue");

const generateBtn = document.getElementById("generateBtn");
const clearBtn = document.getElementById("clearBtn");
const downloadBtn = document.getElementById("downloadBtn");
const qrName = document.getElementById("qrName");
const saveQrBtn = document.getElementById("saveQrBtn");
const qrContainer = document.getElementById("qrContainer");
const scanabilityCard = document.getElementById("scanabilityCard");
const scanabilityScore = document.getElementById("scanabilityScore");
const scanabilityMeter = document.getElementById("scanabilityMeter");
const scanabilityLevel = document.getElementById("scanabilityLevel");
const scanabilityWarnings = document.getElementById("scanabilityWarnings");
const profileStatus = document.getElementById("profileStatus");
const profileBtn = document.getElementById("profileBtn");
const profileModal = document.getElementById("profileModal");
const closeProfileBtn = document.getElementById("closeProfileBtn");
const profileForm = document.getElementById("profileForm");
const profileName = document.getElementById("profileName");
const profileUsername = document.getElementById("profileUsername");
const profileAvatar = document.getElementById("profileAvatar");
const profileEmail = document.getElementById("profileEmail");
const profileError = document.getElementById("profileError");
const generatorModeBtn = document.getElementById("generatorModeBtn");
const scannerModeBtn = document.getElementById("scannerModeBtn");
const generatorWorkspace = document.querySelector(".workspace");
const scannerWorkspace = document.getElementById("scannerSection");
const scannerLiveArea = document.getElementById("scannerLiveArea");
const startScannerBtn = document.getElementById("startScannerBtn");
const qrImageInput = document.getElementById("qrImageInput");
const scanResult = document.getElementById("scanResult");
const resultType = document.getElementById("resultType");
const resultContent = document.getElementById("resultContent");
const urlPreview = document.getElementById("urlPreview");
const resultProtocol = document.getElementById("resultProtocol");
const resultDomain = document.getElementById("resultDomain");
const resultPath = document.getElementById("resultPath");
const resultUrl = document.getElementById("resultUrl");
const openUrlBtn = document.getElementById("openUrlBtn");
const scanAnotherBtn = document.getElementById("scanAnotherBtn");
const httpWarning = document.getElementById("httpWarning");
const savedQrSection = document.getElementById("savedQrSection");
const savedQrList = document.getElementById("savedQrList");
const savedQrMessage = document.getElementById("savedQrMessage");
const refreshSavedQrBtn = document.getElementById("refreshSavedQrBtn");
const profileDescription = document.getElementById("profileDescription");
const profileTitle = document.getElementById("profileTitle");
const profilePassword = document.getElementById("profilePassword");
const authSubmitBtn = document.getElementById("authSubmitBtn");
const authModeBtn = document.getElementById("authModeBtn");
const signOutBtn = document.getElementById("signOutBtn");

let currentQR = null;
let scanner = null;
let scannedUrl = null;
let scanLocked = false;
let supabaseClient = null;
let currentUser = null;
let currentProfile = null;
let authMode = "login";
let editingQrId = null;
const panelTransitionDuration = 220;


function waitForPanelTransition() {
    return new Promise((resolve) => {
        window.setTimeout(resolve, panelTransitionDuration);
    });
}


async function hidePanel(panel) {
    if (panel.hidden) {
        return;
    }

    panel.classList.add("is-hidden");
    await waitForPanelTransition();
    panel.hidden = true;
}


function showPanel(panel) {
    panel.hidden = false;
    panel.classList.add("is-hidden");

    window.requestAnimationFrame(() => {
        panel.classList.remove("is-hidden");
    });
}


function updateProfileStatus() {
    const label = currentProfile?.display_name || currentProfile?.username || currentUser?.email;
    profileStatus.textContent = currentUser ? label : "Iniciar sesión";
    profileBtn.title = currentUser ? "Cuenta" : "Iniciar sesión";
    saveQrBtn.disabled = !currentUser || !currentQR;
    savedQrSection.hidden = !currentUser;
}


function openProfileModal() {
    const isSignedIn = Boolean(currentUser);
    authMode = isSignedIn ? "profile" : "login";
    profileName.value = currentProfile?.display_name || currentProfile?.username || "";
    profileUsername.value = currentProfile?.username || "";
    profileAvatar.value = currentProfile?.avatar_url || "";
    profileName.hidden = isSignedIn;
    profileName.required = !isSignedIn && authMode === "signup";
    profileName.previousElementSibling.hidden = isSignedIn;
    profileEmail.value = currentUser?.email || "";
    profileEmail.disabled = isSignedIn;
    profilePassword.value = "";
    profilePassword.hidden = isSignedIn;
    profilePassword.previousElementSibling.hidden = isSignedIn;
    authSubmitBtn.textContent = isSignedIn ? "Actualizar perfil" : "Iniciar sesión";
    authModeBtn.hidden = isSignedIn;
    signOutBtn.hidden = !isSignedIn;
    profileTitle.textContent = isSignedIn ? "Mi perfil" : "Iniciar sesión";
    profileDescription.textContent = isSignedIn
        ? "Actualiza los datos visibles de tu perfil."
        : "Accede para guardar y administrar tus códigos QR.";
    profileError.hidden = true;
    profileModal.hidden = false;
    profileName.focus();
}


async function loadProfile() {
    if (!currentUser) {
        currentProfile = null;
        return;
    }

    const { data, error } = await supabaseClient
        .from("profiles")
        .select("username, display_name, avatar_url")
        .eq("id", currentUser.id)
        .maybeSingle();

    if (error) {
        console.error("No se pudo cargar el perfil", error);
        return;
    }

    currentProfile = data;
}


async function refreshAuthState(session) {
    currentUser = session?.user || null;
    await loadProfile();
    updateProfileStatus();
    if (currentUser) {
        await loadSavedQrs();
    } else {
        savedQrList.replaceChildren();
    }
}


async function initializeSupabase() {
    if (!window.supabase?.createClient) {
        profileStatus.textContent = "Supabase no disponible";
        return;
    }

    const response = await fetch("/api/config");
    const config = await response.json();
    if (!config.supabasePublishableKey) {
        profileStatus.textContent = "Configura Supabase";
        return;
    }

    supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey);
    supabaseClient.auth.onAuthStateChange((_event, session) => {
        window.setTimeout(() => refreshAuthState(session), 0);
    });
    const { data } = await supabaseClient.auth.getSession();
    await refreshAuthState(data.session);
}


async function loadSavedQrs() {
    if (!currentUser) {
        return;
    }

    const { data, error } = await supabaseClient
        .from("qr_codes")
        .select("id, name, content, qr_color, background_color, size, module_shape, finder_shape, margin")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false });

    if (error) {
        savedQrMessage.textContent = "No se pudieron cargar tus QR.";
        console.error("No se pudieron cargar los QR", error);
        return;
    }

    savedQrList.replaceChildren();
    savedQrMessage.textContent = data.length ? "" : "Todavía no guardaste ningún QR.";
    data.forEach((record) => {
        const item = document.createElement("article");
        item.className = "saved-qr-item";

        const title = document.createElement("h3");
        title.textContent = record.name;
        const content = document.createElement("p");
        content.textContent = record.content;

        const actions = document.createElement("div");
        actions.className = "saved-qr-actions";
        const viewButton = document.createElement("button");
        viewButton.type = "button";
        viewButton.textContent = "Visualizar";
        viewButton.addEventListener("click", () => loadSavedQrIntoGenerator(record, false));
        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.textContent = "Editar";
        editButton.addEventListener("click", () => loadSavedQrIntoGenerator(record, true));
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.textContent = "Eliminar";
        deleteButton.addEventListener("click", () => deleteSavedQr(record.id));
        actions.append(viewButton, editButton, deleteButton);
        item.append(title, content, actions);
        savedQrList.appendChild(item);
    });
}


function loadSavedQrIntoGenerator(record, enableEditing) {
    qrText.value = record.content;
    qrName.value = record.name;
    qrColor.value = record.qr_color;
    bgColor.value = record.background_color;
    qrSize.value = record.size;
    qrShape.value = record.module_shape;
    finderShape.value = record.finder_shape;
    qrMargin.value = record.margin;
    sizeValue.textContent = `${record.size} px`;
    marginValue.textContent = record.margin;
    editingQrId = enableEditing ? record.id : null;
    generatorModeBtn.click();
    generateBtn.click();
}


async function saveCurrentQr() {
    if (!currentUser) {
        openProfileModal();
        return;
    }

    const payload = {
        name: qrName.value.trim() || qrText.value.trim().slice(0, 100),
        content: qrText.value.trim(),
        qr_color: qrColor.value,
        background_color: bgColor.value,
        size: Number(qrSize.value),
        module_shape: qrShape.value,
        finder_shape: finderShape.value,
        margin: Number(qrMargin.value)
    };
    const query = editingQrId
        ? supabaseClient.from("qr_codes").update(payload).eq("id", editingQrId).eq("user_id", currentUser.id)
        : supabaseClient.from("qr_codes").insert({ ...payload, user_id: currentUser.id });
    const { error } = await query;
    if (error) {
        alert(`No se pudo guardar el QR: ${error.message}`);
        return;
    }
    editingQrId = null;
    await loadSavedQrs();
}


async function deleteSavedQr(id) {
    const { error } = await supabaseClient
        .from("qr_codes")
        .delete()
        .eq("id", id)
        .eq("user_id", currentUser.id);
    if (error) {
        alert(`No se pudo eliminar el QR: ${error.message}`);
        return;
    }
    await loadSavedQrs();
}


function closeProfileModal() {
    profileModal.hidden = true;
}


function downloadCurrentQR() {
    const link = document.createElement("a");

    link.download = "alnova-qr.png";
    link.href = currentQR.toDataURL("image/png");
    link.click();
}


function hexToRgb(hex) {
    const value = hex.replace("#", "");
    const normalized = value.length === 3
        ? value.split("").map((part) => part + part).join("")
        : value;

    return [0, 2, 4].map((index) => parseInt(normalized.slice(index, index + 2), 16));
}


function relativeLuminance(hex) {
    return hexToRgb(hex).map((channel) => channel / 255).map((channel) => (
        channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    )).reduce((total, channel, index) => total + channel * [0.2126, 0.7152, 0.0722][index], 0);
}


function updateScanability(modules, size, darkColor, lightColor, shape, finderShape, margin) {
    const contrast = (Math.max(relativeLuminance(darkColor), relativeLuminance(lightColor)) + 0.05)
        / (Math.min(relativeLuminance(darkColor), relativeLuminance(lightColor)) + 0.05);
    const moduleSize = size / (modules + Number(margin) * 2);
    let score = 0;
    const warnings = [];

    score += Math.min(40, Math.max(0, ((contrast - 1) / 20) * 40));
    if (contrast < 4.5) {
        warnings.push("Aumenta el contraste entre el QR y el fondo.");
    }

    score += Math.min(25, Math.max(0, (moduleSize / 4) * 25));
    if (moduleSize < 2) {
        warnings.push("Los módulos son pequeños; aumenta el tamaño del QR.");
    } else if (moduleSize < 3) {
        warnings.push("Un QR más grande será más fácil de escanear.");
    }

    score += Math.min(20, Math.max(0, (Number(margin) / 4) * 20));
    if (Number(margin) < 4) {
        warnings.push("Usa un margen de al menos 4 módulos alrededor del QR.");
    }

    score += shape === "square" ? 10 : shape === "rounded" ? 8 : 5;
    score += finderShape === "square" ? 5 : finderShape === "rounded" ? 4 : 2;

    if (shape !== "square" || finderShape !== "square") {
        warnings.push("Las formas decorativas pueden reducir la compatibilidad con algunos lectores.");
    }

    const roundedScore = Math.round(Math.min(100, score));
    const level = roundedScore >= 80 ? "Alta" : roundedScore >= 55 ? "Media" : "Reducida";
    const levelClass = level.toLowerCase();

    scanabilityScore.textContent = `${roundedScore}/100`;
    scanabilityMeter.style.width = `${roundedScore}%`;
    scanabilityMeter.dataset.level = levelClass;
    scanabilityLevel.textContent = `Escaneabilidad ${level.toLowerCase()}. Es una estimación basada en el diseño actual.`;
    scanabilityWarnings.replaceChildren();

    warnings.forEach((warning) => {
        const item = document.createElement("li");
        item.textContent = warning;
        scanabilityWarnings.appendChild(item);
    });

    scanabilityCard.hidden = false;
}


async function stopScanner() {
    if (!scanner) {
        startScannerBtn.textContent = "Iniciar cámara";
        return;
    }

    try {
        await scanner.stop();
        scanner.clear();
    } catch (error) {
        console.error("No se pudo detener el escáner", error);
    } finally {
        scanner = null;
        startScannerBtn.disabled = false;
        startScannerBtn.textContent = "Iniciar cámara";
    }
}


function getSafeUrl(value) {
    try {
        const candidate = new URL(value.trim());

        if (candidate.protocol !== "http:" && candidate.protocol !== "https:") {
            return null;
        }

        return candidate;
    } catch (error) {
        return null;
    }
}


function classifyScanContent(decodedText) {
    const value = decodedText.trim();
    const parsedUrl = getSafeUrl(value);

    if (parsedUrl) {
        return { type: "Enlace", value: decodedText, url: parsedUrl };
    }

    if (/^tel:\s*\+?[\d\s().-]+$/i.test(value)) {
        return { type: "Teléfono", value: decodedText };
    }

    if (/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(value) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return { type: "Email", value: decodedText };
    }

    if (/^WIFI:/i.test(value)) {
        return { type: "Wi-Fi", value: decodedText };
    }

    if (/^BEGIN:[A-Z-]+/i.test(value) || /^(geo|sms|bitcoin):/i.test(value)) {
        return { type: "Otro formato", value: decodedText };
    }

    return { type: "Texto", value: decodedText };
}


async function showScanResult(decodedText) {
    const result = classifyScanContent(decodedText);
    const parsedUrl = result.url || null;

    scannedUrl = parsedUrl ? parsedUrl.href : null;
    resultType.textContent = result.type;
    resultContent.textContent = result.value;
    urlPreview.hidden = !parsedUrl;
    httpWarning.hidden = !parsedUrl || parsedUrl.protocol !== "http:";

    if (parsedUrl) {
        resultProtocol.textContent = parsedUrl.protocol.replace(":", "").toUpperCase();
        resultDomain.textContent = parsedUrl.hostname;
        resultPath.textContent = `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}` || "/";
        resultUrl.textContent = parsedUrl.href;
    } else {
        resultProtocol.textContent = "—";
        resultDomain.textContent = "—";
        resultPath.textContent = "—";
        resultUrl.textContent = "—";
    }

    await hidePanel(scannerLiveArea);
    showPanel(scanResult);
}


async function showScanError(message) {
    scannedUrl = null;
    resultType.textContent = "Error";
    resultContent.textContent = message;
    urlPreview.hidden = true;
    httpWarning.hidden = true;
    await hidePanel(scannerLiveArea);
    showPanel(scanResult);
}


async function resetScanResult() {
    scanLocked = false;
    scannedUrl = null;
    await hidePanel(scanResult);
    showPanel(scannerLiveArea);
}


async function startScanner() {
    if (typeof Html5Qrcode === "undefined") {
        await showScanError("La librería del escáner no está disponible.");
        return;
    }

    await stopScanner();
    scanLocked = false;
    startScannerBtn.disabled = true;
    startScannerBtn.textContent = "Iniciando cámara...";
    scanner = new Html5Qrcode("reader");

    try {
        await scanner.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            async (decodedText) => {
                if (scanLocked) {
                    return;
                }

                scanLocked = true;
                await stopScanner();
                await showScanResult(decodedText);
            },
            () => {}
        );
        startScannerBtn.disabled = false;
        startScannerBtn.textContent = "Detener cámara";
    } catch (error) {
        console.error("No se pudo iniciar el escáner", error);
        scanner = null;
        startScannerBtn.disabled = false;
        startScannerBtn.textContent = "Iniciar cámara";
        await showScanError("No se pudo acceder a la cámara. Revisa los permisos del navegador.");
    }
}


async function toggleScanner() {
    if (scanner) {
        await stopScanner();
        startScannerBtn.textContent = "Iniciar cámara";
        return;
    }

    await startScanner();
}


async function showMode(mode) {
    const isScanner = mode === "scanner";

    const currentPanel = isScanner ? generatorWorkspace : scannerWorkspace;
    const nextPanel = isScanner ? scannerWorkspace : generatorWorkspace;

    await hidePanel(currentPanel);
    showPanel(nextPanel);
    generatorModeBtn.classList.toggle("active", !isScanner);
    scannerModeBtn.classList.toggle("active", isScanner);

    if (!isScanner) {
        await stopScanner();
    }
}

generatorModeBtn.addEventListener("click", () => showMode("generator"));
scannerModeBtn.addEventListener("click", () => showMode("scanner"));
startScannerBtn.addEventListener("click", toggleScanner);

qrImageInput.addEventListener("change", async () => {
    const [file] = qrImageInput.files;

    if (!file || typeof Html5Qrcode === "undefined") {
        return;
    }

    await stopScanner();

    const imageScanner = new Html5Qrcode("reader");

    try {
        const decodedText = await imageScanner.scanFile(file, true);
        if (!scanLocked) {
            scanLocked = true;
            await showScanResult(decodedText);
        }
    } catch (error) {
        console.error("No se pudo leer la imagen", error);
        await showScanError("No se encontró un código QR válido en la imagen.");
    } finally {
        imageScanner.clear();
        qrImageInput.value = "";
    }
});

openUrlBtn.addEventListener("click", () => {
    if (scannedUrl) {
        window.open(scannedUrl, "_blank", "noopener,noreferrer");
    }
});

scanAnotherBtn.addEventListener("click", async () => {
    await resetScanResult();
});


// Mostrar tamaño
qrSize.addEventListener("input", () => {
    sizeValue.textContent = `${qrSize.value} px`;
});

qrMargin.addEventListener("input", () => {
    marginValue.textContent = qrMargin.value;
});

clearBtn.addEventListener("click", () => {
    qrText.value = "";
    qrColor.value = "#111111";
    bgColor.value = "#ffffff";
    qrSize.value = "350";
    qrShape.value = "square";
    finderShape.value = "square";
    qrMargin.value = "2";
    sizeValue.textContent = "350 px";
    marginValue.textContent = "2";
    qrContainer.innerHTML = "<p>Tu código QR aparecerá aquí</p>";
    scanabilityCard.hidden = true;
    scanabilityWarnings.replaceChildren();
    currentQR = null;
    downloadBtn.disabled = true;
});

profileBtn.addEventListener("click", openProfileModal);
closeProfileBtn.addEventListener("click", closeProfileModal);

profileModal.addEventListener("click", (event) => {
    if (event.target === profileModal) {
        closeProfileModal();
    }
});

profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = profileName.value.trim();
    const email = profileEmail.value.trim().toLowerCase();

    if (authMode === "profile") {
        const { data, error } = await supabaseClient
            .from("profiles")
            .update({
                username: profileUsername.value.trim() || null,
                display_name: name || null,
                avatar_url: profileAvatar.value.trim() || null
            })
            .eq("id", currentUser.id)
            .select("username, display_name, avatar_url")
            .single();
        if (error) {
            profileError.textContent = error.message;
            profileError.hidden = false;
            return;
        }
        currentProfile = data;
        updateProfileStatus();
        closeProfileModal();
        return;
    }

    if (!supabaseClient || !profileEmail.validity.valid || !profilePassword.value) {
        profileError.textContent = "Completa un email y una contraseña válida.";
        profileError.hidden = false;
        return;
    }

    const authResult = authMode === "signup"
        ? await supabaseClient.auth.signUp({ email, password: profilePassword.value })
        : await supabaseClient.auth.signInWithPassword({ email, password: profilePassword.value });

    if (authResult.error) {
        profileError.textContent = authResult.error.message;
        profileError.hidden = false;
        return;
    }

    if (authMode === "signup" && name && authResult.data.user) {
        await supabaseClient.from("profiles").update({
            username: profileUsername.value.trim() || null,
            display_name: name,
            avatar_url: profileAvatar.value.trim() || null
        })
            .eq("id", authResult.data.user.id);
    }

    closeProfileModal();
});

authModeBtn.addEventListener("click", () => {
    authMode = authMode === "signup" ? "login" : "signup";
    profileName.required = authMode === "signup";
    profileName.hidden = authMode === "login";
    profileName.previousElementSibling.hidden = authMode === "login";
    authSubmitBtn.textContent = authMode === "signup" ? "Crear cuenta" : "Iniciar sesión";
    authModeBtn.textContent = authMode === "signup" ? "Ya tengo una cuenta" : "Crear cuenta";
    profileTitle.textContent = authMode === "signup" ? "Crear cuenta" : "Iniciar sesión";
});

signOutBtn.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    closeProfileModal();
});


function drawFinder(ctx, moduleX, moduleY, moduleSize, dark, light, shape) {
    const x = moduleX * moduleSize;
    const y = moduleY * moduleSize;
    const size = moduleSize * 7;

    // Limpiar completamente la zona de 7x7 módulos
    ctx.fillStyle = light;
    ctx.fillRect(x, y, size, size);

    const centerX = x + size / 2;
    const centerY = y + size / 2;

    if (shape === "circle") {
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.arc(centerX, centerY, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = light;
        ctx.beginPath();
        ctx.arc(centerX, centerY, size * 0.34, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.arc(centerX, centerY, size * 0.21, 0, Math.PI * 2);
        ctx.fill();
    } else if (shape === "rounded") {
        const radius = size * 0.18;

        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.roundRect(x, y, size, size, radius);
        ctx.fill();
        ctx.fillStyle = light;
        ctx.beginPath();
        ctx.roundRect(
            x + moduleSize,
            y + moduleSize,
            size - moduleSize * 2,
            size - moduleSize * 2,
            radius * 0.7
        );
        ctx.fill();
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.roundRect(
            x + moduleSize * 2,
            y + moduleSize * 2,
            size - moduleSize * 4,
            size - moduleSize * 4,
            radius * 0.5
        );
        ctx.fill();
    } else {
        ctx.fillStyle = dark;
        ctx.fillRect(x, y, size, size);
        ctx.fillStyle = light;
        ctx.fillRect(
            x + moduleSize,
            y + moduleSize,
            size - moduleSize * 2,
            size - moduleSize * 2
        );
        ctx.fillStyle = dark;
        ctx.fillRect(
            x + moduleSize * 2,
            y + moduleSize * 2,
            size - moduleSize * 4,
            size - moduleSize * 4
        );
    }
}


function drawLogo(ctx, canvasSize, light) {

    return new Promise((resolve, reject) => {

        const logo = new Image();

        logo.onload = () => {

            const logoSize = canvasSize * 0.20;
            const backgroundSize = logoSize * 1.18;

            // Zona limpia
            ctx.fillStyle = light;

            ctx.beginPath();

            ctx.arc(
                canvasSize / 2,
                canvasSize / 2,
                backgroundSize / 2,
                0,
                Math.PI * 2
            );

            ctx.fill();


            // Logo ALnova
            ctx.drawImage(
                logo,
                (canvasSize - logoSize) / 2,
                (canvasSize - logoSize) / 2,
                logoSize,
                logoSize
            );

            resolve();
        };

        logo.onerror = reject;

        logo.src = "/assets/alnova-logo.png";
    });
}


// Dibujar QR personalizado
async function drawQR(modules, moduleCount, size, dark, light, shape, finderShape, margin) {

    const canvas = document.createElement("canvas");

    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");

    const quietZone = Number(margin) || 0;
    const moduleSize = size / (moduleCount + quietZone * 2);

    // Fondo
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, size, size);

    // Módulos
    ctx.fillStyle = dark;

    for (let row = 0; row < moduleCount; row++) {

        for (let col = 0; col < moduleCount; col++) {

            const index = row * moduleCount + col;

            if (!modules[index]) {
                continue;
            }

            const x = (col + quietZone) * moduleSize;
            const y = (row + quietZone) * moduleSize;

            if (shape === "circle") {

                ctx.beginPath();

                ctx.arc(
                    x + moduleSize / 2,
                    y + moduleSize / 2,
                    moduleSize / 2,
                    0,
                    Math.PI * 2
                );

                ctx.fill();

            } else if (shape === "rounded") {

                const radius = moduleSize * 0.3;

                ctx.beginPath();

                ctx.roundRect(
                    x,
                    y,
                    moduleSize,
                    moduleSize,
                    radius
                );

                ctx.fill();

            } else {

                ctx.fillRect(
                    x,
                    y,
                    moduleSize,
                    moduleSize
                );
            }
        }
    }

    // Dibujar los tres patrones de posición
    drawFinder(ctx, quietZone, quietZone, moduleSize, dark, light, finderShape);
    drawFinder(ctx, moduleCount - 7 + quietZone, quietZone, moduleSize, dark, light, finderShape);
    drawFinder(ctx, quietZone, moduleCount - 7 + quietZone, moduleSize, dark, light, finderShape);

    await drawLogo(ctx, size, light);

    return canvas;
}


// Generar QR
generateBtn.addEventListener("click", async () => {

    const text = qrText.value.trim();

    if (!text) {
        alert("Escribí un texto o URL para generar el QR.");
        return;
    }

    generateBtn.disabled = true;
    generateBtn.textContent = "Generando...";

    try {

        const response = await fetch("/api/qr", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                text: text,
                color: qrColor.value,
                background: bgColor.value,
                size: qrSize.value,
                shape: qrShape.value,
                finderShape: finderShape.value,
                margin: qrMargin.value
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Error generando QR");
        }

        // Dibujar QR
        const canvas = await drawQR(
            data.data,
            data.modules,
            Number(qrSize.value),
            qrColor.value,
            bgColor.value,
            qrShape.value,
            finderShape.value,
            qrMargin.value
        );

        // Limpiar QR anterior
        qrContainer.innerHTML = "";

        qrContainer.appendChild(canvas);

        updateScanability(
            data.modules,
            Number(qrSize.value),
            qrColor.value,
            bgColor.value,
            qrShape.value,
            finderShape.value,
            qrMargin.value
        );

        currentQR = canvas;

        downloadBtn.disabled = false;
        saveQrBtn.disabled = !currentUser;

    } catch (error) {

        console.error(error);

        qrContainer.innerHTML =
            "<p>No se pudo generar el código QR.</p>";

        scanabilityCard.hidden = true;

        downloadBtn.disabled = true;

    } finally {

        generateBtn.disabled = false;
        generateBtn.textContent = "Generar QR";
    }
});


// Descargar QR
downloadBtn.addEventListener("click", () => {

    if (!currentQR) {
        return;
    }

    downloadCurrentQR();
});

saveQrBtn.addEventListener("click", saveCurrentQr);
refreshSavedQrBtn.addEventListener("click", loadSavedQrs);
initializeSupabase().catch((error) => {
    console.error("No se pudo inicializar Supabase", error);
    profileStatus.textContent = "Error de autenticación";
});