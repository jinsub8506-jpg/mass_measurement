document.addEventListener('DOMContentLoaded', () => {

    const massDisplay = document.getElementById('mass-display');
    const weighingPan = document.getElementById('weighing-pan');
    const powerButton = document.getElementById('power-button');
    const zeroButton = document.getElementById('zero-button');
    const settingsButton = document.getElementById('settings-button');
    const draggableObjects = document.querySelectorAll('.weight1, .weight2, .weight3, .weight4, .petri-dish, .weighing-paper');
    const explanationText = document.getElementById('explanation-text');

    const objectMasses = {
        'weight1': 25.0, 'weight2': 50.0, 'weight3': 100.0,
        'rabbit': 75.5, 'cat': 123.0, 'powder': 50.8,
        'petri-dish': 15.2,
        'weighing-paper': 0.3
    };

    let objectsOnScale = [];
    let isScaleOn = false;
    let isCalibrating = false;
    let settingsPressTimer = null;
    let initialOffset = 0.0;
    let tareOffset = 0.0;

    function getMassOfElement(element) {
        if (!element) return 0;
        if (element.classList.contains('weight1')) return objectMasses['weight1'];
        if (element.classList.contains('weight2')) return objectMasses['weight2'];
        if (element.classList.contains('weight3')) return objectMasses['weight3'];
        if (element.classList.contains('weight4')) {
            const animalType = element.dataset.animalType;
            return objectMasses[animalType] || 0;
        }
        if (element.classList.contains('petri-dish')) return objectMasses['petri-dish'];
        if (element.classList.contains('weighing-paper')) return objectMasses['weighing-paper'];
        return 0;
    }

    function updateMassDisplay() {
        if (!isScaleOn) {
            massDisplay.textContent = '';
            explanationText.textContent = '전원을 켜주세요.';
            return;
        }

        if (isCalibrating) {
            massDisplay.textContent = 'CAL';
            explanationText.textContent = '보정모드입니다. 선생님께 문의하세요. 전원을 껏다 켜세요.';
            return;
        }
        
        const isPowderOnScale = objectsOnScale.some(obj => obj.dataset.animalType === 'powder');
        if (isPowderOnScale) {
            const hasContainer = objectsOnScale.some(obj =>
                obj.classList.contains('petri-dish') || obj.classList.contains('weighing-paper')
            );
            if (!hasContainer) {
                explanationText.textContent = "가루는 페트리 접시나 약포지를 깔고 무게를 측정해주세요.";
            } else {
                 explanationText.textContent = '영점을 조절하고 무게를 측정해보세요';
            }
        } else {
            explanationText.textContent = '영점을 조절하고 무게를 측정해보세요';
        }
        
        const currentMass = objectsOnScale.reduce((total, obj) => total + getMassOfElement(obj), 0);
        let displayMass = (currentMass + initialOffset) - tareOffset;
        let displayText = displayMass.toFixed(1);
        if (displayText === '-0.0') {
            displayText = '0.0';
        }
        massDisplay.textContent = `${displayText} g`;
    }

    powerButton.addEventListener('click', () => {
        isScaleOn = !isScaleOn;
        if (isScaleOn) {
            initialOffset = (Math.random() * 0.4 - 0.2);
            const massOnPanAtPowerOn = objectsOnScale.reduce((total, obj) => total + getMassOfElement(obj), 0);
            tareOffset = massOnPanAtPowerOn;
        } else {
            isCalibrating = false;
        }
        updateMassDisplay();
    });

    zeroButton.addEventListener('click', () => {
        if (isScaleOn && !isCalibrating) {
            const currentMass = objectsOnScale.reduce((total, obj) => total + getMassOfElement(obj), 0);
            tareOffset = currentMass + initialOffset;
            updateMassDisplay();
        }
    });

    function startSettingsPress() {
        if (!isScaleOn) return;
        settingsPressTimer = setTimeout(() => {
            isCalibrating = true;
            updateMassDisplay();
        }, 2000);
    }

    function endSettingsPress() {
        clearTimeout(settingsPressTimer);
    }

    // 마우스 및 터치 이벤트 핸들러 추가
    settingsButton.addEventListener('mousedown', startSettingsPress);
    settingsButton.addEventListener('mouseup', endSettingsPress);
    settingsButton.addEventListener('mouseleave', endSettingsPress);
    settingsButton.addEventListener('touchstart', startSettingsPress);
    settingsButton.addEventListener('touchend', endSettingsPress);
    settingsButton.addEventListener('touchcancel', endSettingsPress);

    let activeObject = null;
    let offsetX, offsetY;

    function isCenterOverTrapezoid(draggedElement, trapezoidElement) {
        const draggedRect = draggedElement.getBoundingClientRect();
        const trapezoidRect = trapezoidElement.getBoundingClientRect();
        const centerX = draggedRect.left + draggedRect.width / 2;
        const centerY = draggedRect.top + draggedRect.height / 2;
        const p1 = { x: trapezoidRect.left + trapezoidRect.width * 0.2, y: trapezoidRect.top };
        const p2 = { x: trapezoidRect.left + trapezoidRect.width * 0.8, y: trapezoidRect.top };
        const p3 = { x: trapezoidRect.right, y: trapezoidRect.bottom };
        const p4 = { x: trapezoidRect.left, y: trapezoidRect.bottom };
        if (centerY < p1.y || centerY > p3.y) {
            return false;
        }
        const progressY = (centerY - p1.y) / trapezoidRect.height;
        const leftBoundaryX = p4.x + (p1.x - p4.x) * (1 - progressY);
        const rightBoundaryX = p3.x + (p2.x - p3.x) * (1 - progressY);
        return centerX > leftBoundaryX && centerX < rightBoundaryX;
    }

    // 이벤트에서 좌표를 추출하는 헬퍼 함수
    function getEventCoords(e) {
        if (e.touches && e.touches.length) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.changedTouches && e.changedTouches.length) {
            return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    }

    function dragStart(e) {
        activeObject = e.target;
        
        const index = objectsOnScale.indexOf(activeObject);
        if (index > -1) {
            objectsOnScale.splice(index, 1);
        }
        
        updateMassDisplay();

        const coords = getEventCoords(e);
        const rect = activeObject.getBoundingClientRect();
        offsetX = coords.x - rect.left;
        offsetY = coords.y - rect.top;

        document.body.appendChild(activeObject);
        activeObject.classList.add('dragging');

        activeObject.style.transform = 'none';
        activeObject.style.left = `${coords.x - offsetX}px`;
        activeObject.style.top = `${coords.y - offsetY}px`;
        
        // 마우스와 터치 이동 이벤트 리스너 추가
        document.addEventListener('mousemove', dragMove);
        document.addEventListener('touchmove', dragMove, { passive: false });
        
        // 마우스와 터치 종료 이벤트 리스너 추가
        document.addEventListener('mouseup', dragEnd);
        document.addEventListener('touchend', dragEnd);
    }

    function dragMove(e) {
        if (!activeObject) return;
        
        // 터치 스크롤링과 같은 기본 동작 방지
        e.preventDefault();
        
        const coords = getEventCoords(e);
        const x = coords.x - offsetX;
        const y = coords.y - offsetY;

        activeObject.style.left = `${x}px`;
        activeObject.style.top = `${y}px`;
    }

    function dragEnd(e) {
        if (!activeObject) return;

        // 모든 이벤트 리스너 제거
        document.removeEventListener('mousemove', dragMove);
        document.removeEventListener('touchmove', dragMove, { passive: false });
        document.removeEventListener('mouseup', dragEnd);
        document.removeEventListener('touchend', dragEnd);

        activeObject.classList.remove('dragging');
        
        const coords = getEventCoords(e);
        const finalViewportX = coords.x - offsetX;
        const finalViewportY = coords.y - offsetY;
        const finalAbsoluteX = finalViewportX + window.scrollX;
        const finalAbsoluteY = finalViewportY + window.scrollY;
        
        activeObject.style.position = 'absolute';
        activeObject.style.left = `${finalAbsoluteX}px`;
        activeObject.style.top = `${finalAbsoluteY}px`;
        activeObject.style.transform = 'none';
        
        if (isCenterOverTrapezoid(activeObject, weighingPan)) {
            if (!objectsOnScale.includes(activeObject)) {
                objectsOnScale.push(activeObject);
            }
        }
        
        activeObject = null;
        updateMassDisplay();
    }

    draggableObjects.forEach(obj => {
        obj.draggable = false;
        // 마우스와 터치 시작 이벤트 리스너 추가
        obj.addEventListener('mousedown', dragStart);
        obj.addEventListener('touchstart', dragStart);
    });

    updateMassDisplay();
});