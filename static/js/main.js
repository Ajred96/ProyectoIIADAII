$(document).ready(function () {
    let currentFile = null;
    let currentFilename = '';
    let inputChartInstance = null;
    let resultsChartInstance = null;

    // --- MANEJADORES DE EVENTOS ---

    $('#file-upload').on('change', function (e) {
        currentFile = e.target.files[0];
        if (!currentFile) return;

        $('#file-chosen').text(currentFile.name).removeClass('text-gray-500').addClass('text-blue-600 font-semibold');
        const formData = new FormData();
        formData.append('file', currentFile);

        resetUI();

        $.ajax({
            url: '/upload', // Flask route
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function (data) {
                currentFilename = data.filename;
                displayInputData(data);
                $('#solve-button').prop('disabled', false);
                $('#main-content-area').removeClass('max-h-0 opacity-0').addClass('max-h-full opacity-100');
                $('#clear-button').show();
            },
            error: function (xhr) {
                showAlert(xhr.responseJSON.error, 'error');
                resetUI();
            }
        });
    });

    $('#solve-button').on('click', function () {
        if (!currentFilename) return;

        $(this).prop('disabled', true).html('<i class="fas fa-spinner fa-spin mr-2"></i>Resolviendo...');
        $('#results-container, #raw-output-container').html('<div class="flex justify-center items-center p-10"><i class="fas fa-spinner fa-spin fa-3x text-blue-500"></i></div>');

        $.ajax({
            url: '/solve', // Flask route
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({filename: currentFilename}),
            success: function (data) {
                if (data.error) {
                    showAlert(data.error, 'error');
                    $('#results-container, #raw-output-container').html(`<div class="text-center text-red-500 p-4">${data.error}</div>`);
                } else {
                    displayResults(data);
                    showAlert('Solución calculada exitosamente.', 'success');
                    switchTab('results-tab-pane');
                }
            },
            error: function (xhr) {
                const errorMsg = xhr.responseJSON ? xhr.responseJSON.error : "Error desconocido en el servidor.";
                showAlert(errorMsg, 'error');
                $('#results-container, #raw-output-container').html(`<div class="text-center text-red-500 p-4">${errorMsg}</div>`);
            },
            complete: function () {
                $('#solve-button').prop('disabled', true).html('<i class="fas fa-cogs mr-2"></i>Resolver');
            }
        });
    });

    $('#clear-button').on('click', function () {
        $('#file-upload').val('');
        $('#file-chosen').text('Seleccionar un archivo .txt...').removeClass('text-blue-600 font-semibold').addClass('text-gray-500');
        currentFile = null;
        currentFilename = '';
        resetUI();
        $('#clear-button').hide();
    });

    $('.tab').on('click', function () {
        const tabId = $(this).data('tab');
        switchTab(tabId);
    });

    // --- FUNCIONES DE VISUALIZACIÓN ---

    function displayInputData(data) {
        const inputHtml = `
            <div class="grid grid-cols-1 md:grid-cols-12 gap-8">
                <div class="md:col-span-5 space-y-4">
                    <div>
                        <h3 class="text-lg font-semibold text-gray-800 mb-2">Parámetros Generales</h3>
                        <ul class="text-sm space-y-2">
                            ${createListGroupItem("Personas (n)", data.n)}
                            ${createListGroupItem("Opiniones (m)", data.m)}
                            ${createListGroupItem("Costo Máximo (ct)", data.ct, 'gray')}
                            ${createListGroupItem("Movimientos Máx. (maxM)", data.maxM, 'gray')}
                        </ul>
                    </div>
                    <div>
                        <h3 class="text-lg font-semibold text-gray-800 mb-2">Población Inicial (p)</h3>
                        <canvas id="inputChart"></canvas>
                    </div>
                </div>
                <div class="md:col-span-7 space-y-4">
                    <div>
                        <h3 class="text-lg font-semibold text-gray-800 mb-2">Vectores de Opinión</h3>
                        <div class="overflow-auto max-h-52 border rounded-lg">
                            <table class="w-full text-sm text-left text-gray-500">${createVectorTable(data)}</table>
                        </div>
                    </div>
                    <div>
                        <h3 class="text-lg font-semibold text-gray-800 mb-2">Matriz de Costos (c)</h3>
                        <div class="overflow-auto max-h-64 border rounded-lg">
                            <table class="w-full text-sm text-center text-gray-600">${createMatrixTable(data.c, data.m)}</table>
                        </div>
                    </div>
                </div>
            </div>`;
        $('#input-data-container').html(inputHtml).removeClass('opacity-0');

        const ctx = document.getElementById('inputChart').getContext('2d');
        if (inputChartInstance) inputChartInstance.destroy();
        inputChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.p.map((_, i) => `Op ${i + 1}`),
                datasets: [{
                    label: 'Población',
                    data: data.p,
                    backgroundColor: 'rgba(59, 130, 246, 0.5)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1
                }]
            },
            options: {plugins: {legend: {display: false}}, scales: {y: {beginAtZero: true}}}
        });
    }

    function displayResults(data) {
        if (data.status === 'INSATISFACTIBLE') {
            $('#results-container').html(`<div class="text-center text-orange-500 font-semibold p-6 bg-orange-50 rounded-lg">${data.status}</div>`);
            $('#raw-output-container').html(`<div class="bg-gray-800 text-gray-300 text-xs p-4 rounded-lg overflow-x-auto max-h-96"><pre><code>${data.raw_output}</code></pre></div>`);
            return;
        }

        $('#results-container').html('<div class="opacity-0 transition-opacity duration-500"></div>');

        const matrixHtml = (data.movements_matrix && data.movements_matrix.length > 0)
            ? `<div class="mt-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">Matriz de Movimientos (x)</h3>
                    <div class="overflow-auto max-h-96 border rounded-lg">
                        <table class="w-full text-sm text-center text-gray-600">${createMatrixTable(data.movements_matrix, data.movements_matrix.length, true)}</table>
                    </div>
                </div>`
            : '';
        
        const executionTimeHtml = data.execution_time
            ? createListGroupItem("Tiempo de Ejecución", `${data.execution_time.toFixed(3)} seg.`, "purple")
            : '';

        const fullResultsHtml = `
            <div class="grid grid-cols-1 md:grid-cols-12 gap-8">
                <div class="md:col-span-5 space-y-4">
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">Resumen de la Solución</h3>
                    <ul class="text-sm space-y-2">
                        ${createListGroupItem("Estado", data.status, "blue")}
                        ${createListGroupItem("Extremismo Inicial", data.initial_extremism.toFixed(3), "gray")}
                        ${createListGroupItem("<strong>Extremismo Final</strong>", `<strong>${data.final_extremism.toFixed(3)}</strong>`, "green")}
                        ${createListGroupItem("Costo Total", data.total_cost.toFixed(2), "teal")}
                        ${createListGroupItem("Movimientos Totales", data.total_moves.toFixed(2), "teal")}
                        ${executionTimeHtml}
                    </ul>
                </div>
                <div class="md:col-span-7">
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">Población Final</h3>
                    <canvas id="resultsChart"></canvas>
                </div>
            </div>
            ${matrixHtml}`;

        $('#results-container').find('.opacity-0').html(fullResultsHtml).removeClass('opacity-0');

        if (typeof data.final_distribution === 'object') {
            const resultsCtx = document.getElementById('resultsChart').getContext('2d');
            if (resultsChartInstance) resultsChartInstance.destroy();
            resultsChartInstance = new Chart(resultsCtx, {
                type: 'bar',
                data: {
                    labels: data.final_distribution.map((_, i) => `Op ${i + 1}`),
                    datasets: [{
                        label: 'Población Final',
                        data: data.final_distribution,
                        backgroundColor: 'rgba(16, 185, 129, 0.5)',
                        borderColor: 'rgba(16, 185, 129, 1)',
                        borderWidth: 1
                    }]
                },
                options: {plugins: {legend: {display: false}}, scales: {y: {beginAtZero: true}}}
            });
        }

        const rawOutputHtml = `<div class="opacity-0 transition-opacity duration-500 bg-gray-800 text-gray-300 text-xs p-4 rounded-lg overflow-x-auto max-h-96"><pre><code>${data.raw_output}</code></pre></div>`;
        $('#raw-output-container').html(rawOutputHtml).find('.opacity-0').removeClass('opacity-0');
    }

    function createListGroupItem(label, value, color = 'blue') {
        const colors = {
            blue: 'bg-blue-100 text-blue-800',
            gray: 'bg-gray-100 text-gray-800',
            green: 'bg-green-100 text-green-800',
            teal: 'bg-teal-100 text-teal-800',
            purple: 'bg-purple-100 text-purple-800'
        };
        return `<li class="flex justify-between items-center p-3 bg-gray-50 rounded-lg"><span>${label}</span><span class="font-mono font-semibold px-2 py-1 rounded-md ${colors[color]}">${value}</span></li>`;
    }

    function createVectorTable(data) {
        let body = [...Array(data.m).keys()].map(i =>
            `<tr class="bg-white border-b hover:bg-gray-50">
                <td class="py-3 px-4 font-bold text-gray-900">${i + 1}</td>
                <td class="py-3 px-4">${data.p[i]}</td>
                <td class="py-3 px-4">${data.ext[i]}</td>
                <td class="py-3 px-4">${data.ce[i]}</td>
            </tr>`
        ).join('');
        return `<thead class="text-xs text-gray-700 uppercase bg-gray-100"><tr><th class="py-3 px-4">Op.</th><th class="py-3 px-4">Pob. (p)</th><th class="py-3 px-4">Valor (ext)</th><th class="py-3 px-4">Costo Extra (ce)</th></tr></thead><tbody>${body}</tbody>`;
    }

    function createMatrixTable(matrix, size, highlight = false) {
        let headers = [...Array(size).keys()].map(i => `<th class="py-2 px-3">Op. ${i + 1}</th>`).join('');
        let body = matrix.map((row, i) => {
            let cells = row.map((cell) => {
                const cellClass = (highlight && cell > 0) ? 'bg-yellow-200 font-bold' : '';
                return `<td class="py-2 px-3 border-t border-l ${cellClass}">${cell}</td>`;
            }).join('');
            return `<tr><th class="py-2 px-3 bg-gray-100 font-semibold">Op. ${i + 1}</th>${cells}</tr>`;
        }).join('');
        return `
            <thead class="text-xs text-gray-700 uppercase bg-gray-100">
                <tr>
                    <th class="py-2 px-3 font-semibold whitespace-nowrap">Origen / Destino</th>
                    ${headers}
                </tr>
            </thead>
            <tbody>${body}</tbody>
        `;
    }

    // --- FUNCIONES AUXILIARES ---

    function switchTab(tabId) {
        $('.tab-pane').removeClass('active').addClass('hidden');
        $('#' + tabId).addClass('active').removeClass('hidden');
        $('.tab').removeClass('active');
        $(`.tab[data-tab="${tabId}"]`).addClass('active');
    }

    function resetUI() {
        $('#solve-button').prop('disabled', true);
        $('#main-content-area').removeClass('max-h-full opacity-100').addClass('max-h-0 opacity-0');
        $('#input-data-container, #results-container, #raw-output-container').html('');
        if (inputChartInstance) inputChartInstance.destroy();
        if (resultsChartInstance) resultsChartInstance.destroy();
        switchTab('input-tab-pane');
    }

    function showAlert(message, type = 'info') {
        const colors = {success: 'bg-green-500', error: 'bg-red-500', info: 'bg-blue-500'};
        const icon = {success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle'};
        const alert = $(`
            <div class="alert-item flex items-center text-white text-sm font-bold px-4 py-3 rounded-lg shadow-lg relative ${colors[type]}" role="alert" style="transform: translateX(120%); opacity: 0; transition: all 0.5s ease-out;">
                <i class="fas ${icon[type]} mr-2"></i>
                <p>${message}</p>
            </div>
        `);

        $('#alert-container').append(alert);
        setTimeout(() => {
            alert.css({'transform': 'translateX(0)', 'opacity': '1'});
        }, 10);

        setTimeout(() => {
            alert.css({'transform': 'translateX(120%)', 'opacity': '0'});
            setTimeout(() => alert.remove(), 500);
        }, 5000);
    }
});