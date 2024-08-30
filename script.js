function getCustomDayOfWeek(dateString) {
    const date = new Date(dateString);
    const day = date.getUTCDay();
    return day === 0 ? 7 : day;
}

async function generarPlanilla() {
    const nombre = document.getElementById('nombre').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const consumisionTotal = parseInt(document.getElementById('consumisionTotal').value, 10);
    const quincena = document.getElementById('quincena').value;

    const tabla = document.getElementById('tablaPlanilla').querySelector('tbody');
    tabla.innerHTML = '';

    const dateArray = generateDateRange(startDate, endDate);
    const feriados = await obtenerFeriados();
    const diasHabilitados = dateArray.filter(date => !feriados.has(date) && getCustomDayOfWeek(date) < 6);

    const consumisionDiaria = diasHabilitados.length > 0 ? Math.floor(consumisionTotal / diasHabilitados.length) : 0;

    let totalConsumido = 0;
    let totalLacerie = 0;

    dateArray.forEach(date => {
        const row = document.createElement('tr');
        const customDayOfWeek = getCustomDayOfWeek(date);
        const isFeriado = feriados.has(date);
        const formattedDate = formatDate(date);
        let consumicionDia = 0;
        let acer = 0;
        let firma = '';

        if (isFeriado) {
            consumicionDia = 0;
            acer = 0;
            firma = 'FERIADO';
        } else if (customDayOfWeek === 7) { // Domingo
            consumicionDia = 0;
            acer = 0;
            firma = 'DOMINGO';
            row.classList.add('red-background');
        } else if (customDayOfWeek === 6) { // Sábado
            consumicionDia = 0;
            acer = 0;
            firma = '---';
            row.classList.add('darker-gray-background');
        } else { // Días habilitados (Lunes a Viernes)
            consumicionDia = consumisionDiaria;
            acer = 13000;
            firma = '';
        }

        totalConsumido += consumicionDia;
        totalLacerie += acer;

        const valorFuncionario = consumicionDia - acer;

        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${consumicionDia > 0 ? `₲ ${consumicionDia}` : firma}</td>
            <td>${valorFuncionario > 0 ? `₲ ${valorFuncionario}` : firma}</td>
            <td>${acer > 0 ? `₲ ${acer}` : firma}</td>
            <td>${firma}</td>
        `;

        tabla.appendChild(row);
    });

    // Obtener el mes automáticamente
    const mes = new Date(startDate).toLocaleString('es-ES', { month: 'long' }).toUpperCase();
    const anio = new Date(startDate).getFullYear();
    const quincenaTexto = quincena === "PRIMERA QUINCENA" ? `PRIMERA QUINCENA DE ${mes}` : `SEGUNDA QUINCENA DE ${mes}`;

    // Fila Total Quincena
    const totalRow = document.createElement('tr');
    totalRow.innerHTML = `
        <td><strong>TOTAL QUINCENA</strong></td>
        <td><strong>₲ ${consumisionTotal}</strong></td>
        <td><strong>₲ ${consumisionTotal - totalLacerie}</strong></td>
        <td><strong>₲ ${totalLacerie}</strong></td>
        <td><strong></strong></td>
    `;
    tabla.appendChild(totalRow);

    document.getElementById('nombrePlanilla').textContent = `Nombre y Apellido: ${nombre}`;
    document.getElementById('quincenaPlanilla').textContent = quincenaTexto;
    document.getElementById('anoPlanilla').textContent = `AÑO: ${anio}`;
    document.getElementById('planilla').style.display = 'block';
}

function generateDateRange(startDate, endDate) {
    const dateArray = [];
    let currentDate = new Date(startDate);
    const stopDate = new Date(endDate);

    while (currentDate <= stopDate) {
        dateArray.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return dateArray;
}

function formatDate(dateString) {
    const [year, month, day] = dateString.split('-');
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
}

async function obtenerFeriados() {
    const year = new Date().getFullYear();
    const response = await fetch(`https://date.nager.at/Api/v2/PublicHolidays/${year}/PY`);
    const data = await response.json();
    return new Set(data.map(holiday => holiday.date));
}

function descargarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'pt', 'a4');

    const nombre = document.getElementById('nombre').value;
    const quincena = document.getElementById('quincena').value;
    const mes = new Date(document.getElementById('startDate').value).toLocaleString('es-ES', { month: 'long' }).toUpperCase();
    const anio = new Date().getFullYear();
    const quincenaTexto = quincena === "PRIMERA QUINCENA" ? `PRIMERA QUINCENA DE ${mes}` : `SEGUNDA QUINCENA DE ${mes}`;

    doc.setFontSize(14);
    doc.text(`Nombre y Apellido: ${nombre}`, 40, 40);
    doc.text(`Quincena: ${quincenaTexto}`, 40, 60);
    doc.text(`AÑO: ${anio}`, 40, 80);

    const tabla = document.getElementById('tablaPlanilla');
    const filas = tabla.querySelectorAll('tbody tr');

    const data = [];
    const styles = [];

    filas.forEach((fila, index) => {
        const celdas = Array.from(fila.querySelectorAll('td')).map(td => td.innerText);
        data.push(celdas);

        if (fila.classList.contains('red-background')) {
            styles.push({ fillColor: [255, 221, 221] });  // Color rojo claro para domingos
        } else if (fila.classList.contains('darker-gray-background')) {
            styles.push({ fillColor: [204, 204, 204] });  // Color gris para sábados
        } else if (index === filas.length - 1) {  // Última fila (Total Quincena)
            styles.push({ fillColor: [41, 128, 185], textColor: [255, 255, 255], fontStyle: 'bold' });  // Color azul para total
        } else {
            styles.push({ fillColor: [255, 255, 255] });  // Fondo blanco para días normales
        }
    });

    doc.autoTable({
        head: [['FECHA', 'CONSUMICIÓN TOTAL', 'FUNCIONARIO', "L'ACERIE", 'FIRMA']],
        body: data,
        styles: { fontSize: 10 },
        theme: 'plain',
        startY: 100,
        didParseCell: function (data) {
            const style = styles[data.row.index];
            if (style) {
                data.cell.styles.fillColor = style.fillColor;
                data.cell.styles.textColor = style.textColor || [0, 0, 0];
                data.cell.styles.fontStyle = style.fontStyle || 'normal';
            }
        }
    });

    doc.save(`Planilla_${nombre}.pdf`);
}
