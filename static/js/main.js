$(document).ready(function () {
    let currentData = null;
    let inputChartInstance = null;
    let resultsChartInstance = null;
    let isCustomInstance = false;

    // --- MANEJADORES DE EVENTOS PRINCIPALES ---

    $('#file-upload').on('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;

        resetUI();
        $('#file-chosen').text(file.name).removeClass('text-gray-500').addClass('text-blue-600 font-semibold');
        const formData = new FormData();
        formData.append('file', file);

        $.ajax({
            url: '/upload',
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function (data) {
                if (data.error) {
                    showAlert(data.error, 'error');
                    resetUI();
                    return;
                }
                isCustomInstance = false;
                loadDataIntoInterface(data, `Instancia: ${file.name}`);
                // 1. Deshabilitar y cambiar estilo del botón de crear instancia
                $('#create-instance-button').prop('disabled', true).addClass('disabled:bg-gray-400 disabled:cursor-not-allowed');
            },
            error: function (xhr) {
                showAlert(xhr.responseJSON.error, 'error');
                resetUI();
            }
        });
    });

    $('#solve-button').on('click', function () {
        if (!currentData) return;
        
        // 2. Cambiar a la pestaña de resultados y actualizar estado del botón
        switchTab('results-tab-pane');
        $(this).prop('disabled', true).html('Resolviendo...');
        $('#results-container, #raw-output-container').html('<div class="flex justify-center items-center p-10"><i class="fas fa-spinner fa-spin fa-3x text-blue-500"></i></div>');

        $.ajax({
            url: '/solve',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(currentData),
            success: function (data) {
                if (data.error) {
                    showAlert(data.error, 'error');
                    $('#results-container').html(`<div class="text-center text-red-500 p-4">${data.error}</div>`);
                    // 2. Reactivar solo en caso de error
                    $('#solve-button').prop('disabled', false).html('Resolver');
                } else {
                    displayResults(data);
                    // El botón resolver permanece desactivado después de un éxito
                }
            },
            error: function (xhr) {
                const errorMsg = xhr.responseJSON ? xhr.responseJSON.error : "Error desconocido.";
                showAlert(errorMsg, 'error');
                $('#results-container').html(`<div class="text-center text-red-500 p-4">${errorMsg}</div>`);
                // 2. Reactivar solo en caso de error
                $('#solve-button').prop('disabled', false).html('Resolver');
            }
        });
    });

    $('#clear-button').on('click', function () {
        resetUI();
    });

    // --- MANEJADORES PARA CREAR/EDITAR INSTANCIA (MODAL) ---
    
    $('#create-instance-button').on('click', function() {
        resetUI();
        isCustomInstance = true;
        openCreationModal();
    });
    
    $('#edit-instance-button').on('click', function() {
        openCreationModal(currentData);
    });

    $('#modal-next-step').on('click', function() {
        const m = parseInt($('#modal-input-m').val(), 10);
        if (isNaN(m) || m <= 0) {
            showAlert('Por favor, introduce un número de opiniones válido.', 'error');
            return;
        }
        generateCreationForm(m);
        $('#modal-step-1').hide();
        $('#modal-step-2').show();
    });

    $('#modal-confirm-button').on('click', function() {
        const instanceData = getDataFromCreationForm();
        if (!instanceData) {
            showAlert('Por favor, rellena todos los campos del formulario con valores numéricos.', 'error');
            return;
        }
        loadDataIntoInterface(instanceData, "Instancia Personalizada");
        $('#create-modal').hide();
    });

    $('.modal-cancel-button').on('click', function() {
        if (!currentData) {
            resetUI();
        }
        $('#create-modal').hide();
    });
    
    // --- LÓGICA DE CARGA Y VISUALIZACIÓN ---

    function loadDataIntoInterface(data, title) {
        currentData = data;
        $('#instance-title').text(title);
        displayInputData(data);

        $('#solve-button').prop('disabled', false).html('Resolver');
        $('#main-content-area').removeClass('max-h-0 opacity-0').addClass('max-h-full opacity-100');
        $('#clear-button').show();
        $('#edit-instance-button').toggle(isCustomInstance);

        switchTab('input-tab-pane');
    }

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
            type: 'bar', data: {
                labels: data.p.map((_, i) => `Op ${i + 1}`),
                datasets: [{ label: 'Población', data: data.p, backgroundColor: 'rgba(59, 130, 246, 0.5)', borderColor: 'rgba(59, 130, 246, 1)', borderWidth: 1 }]
            }, options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
        });
    }

    function displayResults(data) {
        if (data.status === 'INSATISFACTIBLE') {
            let timeInfo = data.execution_time ? `Tiempo: ${data.execution_time.toFixed(2)}s` : '';
            $('#results-container').html(`<div class="text-center p-6 bg-orange-50 rounded-lg"><p class="text-orange-500 font-semibold">${data.status}</p><p class="text-sm text-gray-600 mt-2">${timeInfo}</p></div>`);
            $('#raw-output-container').html(`<div class="bg-gray-800 text-gray-300 text-xs p-4 rounded-lg overflow-x-auto max-h-96"><pre><code>${data.raw_output}</code></pre></div>`);
            $('#solve-button').prop('disabled', true).html('Resolver');
            return;
        }

        $('#results-container').html('<div class="opacity-0 transition-opacity duration-500"></div>');
        const matrixHtml = (data.movements_matrix && data.movements_matrix.length > 0) ? `<div class="mt-6"><h3 class="text-lg font-semibold text-gray-800 mb-2">Matriz de Movimientos (x)</h3><div class="overflow-auto max-h-96 border rounded-lg"><table class="w-full text-sm text-center text-gray-600">${createMatrixTable(data.movements_matrix, data.movements_matrix.length, true)}</table></div></div>` : '';
        const fullResultsHtml = `
            <div class="grid grid-cols-1 md:grid-cols-12 gap-8">
                <div class="md:col-span-5 space-y-4">
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">Resumen</h3>
                    <ul class="text-sm space-y-2">
                        ${createListGroupItem("Estado", data.status, "blue")}
                        ${createListGroupItem("Extremismo Inicial", data.initial_extremism.toFixed(3), "gray")}
                        ${createListGroupItem("<strong>Extremismo Final</strong>", `<strong>${data.final_extremism.toFixed(3)}</strong>`, "green")}
                        ${createListGroupItem("Costo Total", data.total_cost.toFixed(2), "teal")}
                        ${createListGroupItem("Movimientos Totales", data.total_moves.toFixed(0), "teal")}
                        ${createListGroupItem("Tiempo de Ejecución", `${data.execution_time.toFixed(2)}s`, "blue")}
                    </ul>
                </div>
                <div class="md:col-span-7"><h3 class="text-lg font-semibold text-gray-800 mb-2">Población Final</h3><canvas id="resultsChart"></canvas></div>
            </div>${matrixHtml}`;
        $('#results-container').find('.opacity-0').html(fullResultsHtml).removeClass('opacity-0');

        const resultsCtx = document.getElementById('resultsChart').getContext('2d');
        if (resultsChartInstance) resultsChartInstance.destroy();
        resultsChartInstance = new Chart(resultsCtx, {
            type: 'bar', data: {
                labels: data.final_distribution.map((_, i) => `Op ${i + 1}`),
                datasets: [{ label: 'Población Final', data: data.final_distribution, backgroundColor: 'rgba(16, 185, 129, 0.5)', borderColor: 'rgba(16, 185, 129, 1)', borderWidth: 1 }]
            }, options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
        });

        $('#raw-output-container').html(`<div class="bg-gray-800 text-gray-300 text-xs p-4 rounded-lg overflow-x-auto max-h-96"><pre><code>${data.raw_output}</code></pre></div>`);
        $('#solve-button').prop('disabled', true).html('Resolver');
    }

    // --- FORMULARIO DE CREACIÓN DINÁMICO ---
    
    function openCreationModal(dataToEdit = null) {
        $('#create-modal').show();
        if (dataToEdit) {
            $('#modal-title').text('Editar Instancia Personalizada');
            $('#modal-input-m').val(dataToEdit.m);
            generateCreationForm(dataToEdit.m, dataToEdit);
            $('#modal-step-1').hide();
            $('#modal-step-2').show();
        } else {
            $('#modal-title').text('Crear Nueva Instancia');
            $('#modal-input-m').val('');
            $('#modal-step-1').show();
            $('#modal-step-2').hide();
        }
    }

    function generateCreationForm(m, data = null) {
        const getVal = (path, index, defaultVal) => {
            if (!data) return defaultVal;
            if (path.includes('.')) {
                const keys = path.split('.');
                let val = data;
                for (const key of keys) {
                    if (val === undefined || val[key] === undefined) return defaultVal;
                    val = val[key];
                }
                 return val[index];
            }
            return data[path] !== undefined ? (Array.isArray(data[path]) ? data[path][index] : data[path]) : defaultVal;
        };

        const form = $('#create-instance-form');
        form.html(''); 
        const inputClass = "mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm";
        const labelClass = "block text-sm font-medium text-gray-700";

        let generalHtml = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-6">
                <div><label for="form-n" class="${labelClass}">Personas (n)</label><input type="number" id="form-n" class="${inputClass}" value="${getVal('n', null, 100)}"></div>
                <div><label for="form-ct" class="${labelClass}">Costo Máximo (ct)</label><input type="number" step="any" id="form-ct" class="${inputClass}" value="${getVal('ct', null, 1000)}"></div>
                <div><label class="${labelClass}">Opiniones (m)</label><input type="number" value="${m}" class="${inputClass}" disabled></div>
                <div><label for="form-maxM" class="${labelClass}">Movimientos Máx. (maxM)</label><input type="number" id="form-maxM" class="${inputClass}" value="${getVal('maxM', null, 50)}"></div>
            </div>`;
        form.append(generalHtml);

        let vectorsHtml = `<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">`;
        ['p', 'ext', 'ce'].forEach(vec => {
            let inputs = '';
            for(let i=0; i<m; i++) {
                const defVal = (vec === 'p') ? 10 : ((vec === 'ext') ? (Math.random()).toFixed(3) : (Math.random()*10).toFixed(2));
                inputs += `<input type="number" step="any" class="${inputClass}" placeholder="Op. ${i+1}" value="${getVal(vec, i, defVal)}">`;
            }
            vectorsHtml += `<div><label class="${labelClass} mb-2">${vec.toUpperCase()}</label><div id="form-${vec}-container" class="space-y-2">${inputs}</div></div>`;
        });
        vectorsHtml += `</div>`;
        form.append(vectorsHtml);

        let matrixHtml = `<label class="${labelClass} mb-2">Matriz de Costos (c)</label><div class="overflow-x-auto"><table id="form-c-matrix" class="min-w-full divide-y divide-gray-200 border">`;
        matrixHtml += '<thead class="bg-gray-50"><tr><th class="px-3 py-2"></th>';
        for (let j = 0; j < m; j++) { matrixHtml += `<th class="px-3 py-2 text-center text-xs uppercase">Op. ${j+1}</th>`; }
        matrixHtml += '</tr></thead><tbody>';
        for (let i = 0; i < m; i++) {
            matrixHtml += `<tr><td class="px-3 py-2 font-medium text-gray-900 bg-gray-50">Op. ${i+1}</td>`;
            for (let j = 0; j < m; j++) {
                const defVal = (i === j) ? 0 : (Math.random() * 5).toFixed(2);
                const cellVal = data ? getVal(`c.${i}`, j, defVal) : defVal;
                matrixHtml += `<td class="p-1"><input type="number" step="any" value="${cellVal}" class="${inputClass} text-center" ${i===j ? 'disabled':''}></td>`;
            }
            matrixHtml += '</tr>';
        }
        matrixHtml += '</tbody></table></div>';
        form.append(matrixHtml);
    }
    
    function getDataFromCreationForm() {
        const data = {};
        try {
            data.m = parseInt($('#create-instance-form input[value][disabled]').val(), 10);
            data.n = parseInt($('#form-n').val(), 10);
            data.ct = parseFloat($('#form-ct').val());
            data.maxM = parseInt($('#form-maxM').val(), 10);
            data.p = $('#form-p-container input').map((_, el) => parseInt($(el).val(), 10)).get();
            data.ext = $('#form-ext-container input').map((_, el) => parseFloat($(el).val())).get();
            data.ce = $('#form-ce-container input').map((_, el) => parseFloat($(el).val())).get();
            data.c = [];
            for (let i = 0; i < data.m; i++) {
                const row = $(`#form-c-matrix tbody tr:eq(${i}) input`).map((_, el) => parseFloat($(el).val())).get();
                data.c.push(row);
            }
            if ([data.n, data.ct, data.maxM, ...data.p, ...data.ext, ...data.ce, ...data.c.flat()].some(v => v === null || isNaN(v))) return null;
        } catch(e) { return null; }
        return data;
    }

    // --- FUNCIONES AUXILIARES ---
    function resetUI() {
        currentData = null;
        isCustomInstance = false;
        
        $('#solve-button').prop('disabled', true).html('Resolver');
        $('#create-instance-button').prop('disabled', false).removeClass('disabled:bg-gray-400 disabled:cursor-not-allowed');
        $('#file-upload').prop('disabled', false).val('');
        $('#file-chosen').text('Seleccionar un archivo .txt...').removeClass('text-blue-600 font-semibold').addClass('text-gray-500');

        $('#clear-button, #edit-instance-button').hide();
        $('#main-content-area').removeClass('max-h-full opacity-100').addClass('max-h-0 opacity-0');
        
        $('#input-data-container, #results-container, #raw-output-container, #instance-title').html('');
        if (inputChartInstance) inputChartInstance.destroy();
        if (resultsChartInstance) resultsChartInstance.destroy();
        switchTab('input-tab-pane');
    }

    function createListGroupItem(label, value, color = 'blue') {
        const colors = { blue: 'bg-blue-100 text-blue-800', gray: 'bg-gray-100 text-gray-800', green: 'bg-green-100 text-green-800', teal: 'bg-teal-100 text-teal-800' };
        return `<li class="flex justify-between items-center p-3 bg-gray-50 rounded-lg"><span>${label}</span><span class="font-mono font-semibold px-2 py-1 rounded-md ${colors[color]}">${value}</span></li>`;
    }

    function createVectorTable(data) {
        let body = [...Array(data.m).keys()].map(i => `<tr class="bg-white border-b hover:bg-gray-50"><td class="py-3 px-4 font-bold text-gray-900">${i + 1}</td><td class="py-3 px-4">${data.p[i]}</td><td class="py-3 px-4">${data.ext[i]}</td><td class="py-3 px-4">${data.ce[i]}</td></tr>`).join('');
        return `<thead class="text-xs text-gray-700 uppercase bg-gray-100"><tr><th class="py-3 px-4">Op.</th><th class="py-3 px-4">Pob. (p)</th><th class="py-3 px-4">Valor (ext)</th><th class="py-3 px-4">Costo Extra (ce)</th></tr></thead><tbody>${body}</tbody>`;
    }

    function createMatrixTable(matrix, size, highlight = false) {
        let headers = [...Array(size).keys()].map(i => `<th class="py-2 px-3">Op. ${i + 1}</th>`).join('');
        let body = matrix.map((row, i) => {
            let cells = row.map((cell) => {
                const cellVal = (typeof cell.toFixed === 'function') ? cell.toFixed(2) : cell;
                const cellClass = (highlight && cell > 0) ? 'bg-yellow-200 font-bold' : '';
                return `<td class="py-2 px-3 border-t border-l ${cellClass}">${cellVal}</td>`;
            }).join('');
            return `<tr><th class="py-2 px-3 bg-gray-100 font-semibold">Op. ${i + 1}</th>${cells}</tr>`;
        }).join('');
        return `<thead class="text-xs text-gray-700 uppercase bg-gray-100"><tr><th class="py-2 px-3 font-semibold whitespace-nowrap">Origen / Destino</th>${headers}</tr></thead><tbody>${body}</tbody>`;
    }
    
    function switchTab(tabId) {
        $('.tab-pane').removeClass('active').addClass('hidden');
        $('#' + tabId).addClass('active').removeClass('hidden');
        $('.tab').removeClass('active');
        $(`.tab[data-tab="${tabId}"]`).addClass('active');
    }

    function showAlert(message, type = 'info') {
        const colors = {success: 'bg-green-500', error: 'bg-red-500', info: 'bg-blue-500'};
        const icon = {success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle'};
        const alert = $(`<div class="alert-item flex items-center text-white text-sm font-bold px-4 py-3 rounded-lg shadow-lg relative ${colors[type]}" role="alert" style="transform: translateX(120%); opacity: 0; transition: all 0.5s ease-out;"><i class="fas ${icon[type]} mr-2"></i><p>${message}</p></div>`);
        $('#alert-container').append(alert);
        setTimeout(() => alert.css({'transform': 'translateX(0)', 'opacity': '1'}), 10);
        setTimeout(() => {
            alert.css({'transform': 'translateX(120%)', 'opacity': '0'});
            setTimeout(() => alert.remove(), 500);
        }, 5000);
    }

    $('.tab').on('click', function () {
        const tabId = $(this).data('tab');
        switchTab(tabId);
    });
});