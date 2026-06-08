// This one keeps all lists for different days
let tasksByDate = JSON.parse(localStorage.getItem("calendarTasks")) || {};

// Place to keep holidays
let holidaysByDate = {};

// Made it to not get lost in calendar, so it saves current day
let currentDate = new Date();

// So for start app selects today
let selectedDate = formatDate(new Date());

// Just localStorage to sasve all tasks
function saveTasks() {
    localStorage.setItem("calendarTasks", JSON.stringify(tasksByDate));
}

// Convertor to better format for later usage
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

// So this part returns list for selected day and if there is no list, then it returns empty list
function getSelectedTasks() {
    if (!tasksByDate[selectedDate]) {
        tasksByDate[selectedDate] = [];
    }

    return tasksByDate[selectedDate];
}

// Error message
function showError(message) {
    $("#error-msg").text(message);
    $("#task-input").addClass("invalid");
}

// Deletes error message if user starec typing
function clearError() {
    $("#error-msg").text("");
    $("#task-input").removeClass("invalid");
}

// Checks task for errors
function validateTask(text) {
    if (text.trim() === "") return "Task cannot be empty";
    if (text.trim().length < 3) return "Minimum 3 characters";
    return "";
}

// Updates the counter in the circle in format completed tasks / all tasks
function updateCounter() {
    const tasks = getSelectedTasks();
    const total = tasks.length;
    const completed = tasks.filter(task => task.selected).length;

    $("#task-counter").text(`${completed} / ${total}`);
}

// Creates and shows the calendar for the current month
function renderCalendar() {
    const calendar = $("#calendar");
    calendar.empty();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthName = currentDate.toLocaleString("en-US", {
        month: "long",
        year: "numeric"
    });

    $("#month-title").text(monthName);

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const todayKey = formatDate(new Date());

    // Just to make app show monday as a firts day
    let startDay = firstDay.getDay();
    startDay = startDay === 0 ? 6 : startDay - 1;

    // Empty cells before the first day of the month
    for (let i = 0; i < startDay; i++) {
        calendar.append('<div class="empty-day"></div>');
    }

    // Creates a button for days
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(year, month, day);
        const dateKey = formatDate(date);
        const button = $("<button></button>");

        button.addClass("day-btn");
        button.text(day);
        button.attr("type", "button");
        button.attr("data-date", dateKey);

        // Shows today's date
        if (dateKey === todayKey) {
            button.addClass("today");
        }

        // Shows which day is now selected
        if (dateKey === selectedDate) {
            button.addClass("selected");
        }

        // Marks days if the have some tasks
        if (tasksByDate[dateKey] && tasksByDate[dateKey].length > 0) {
            button.addClass("has-tasks");
        }

        // Marks all finnish holidays with axios
        if (holidaysByDate[dateKey]) {
            button.addClass("holiday");
            button.attr("title", holidaysByDate[dateKey]);
        }

        calendar.append(button);
    }
}

// Shows tasks for the selected day
function renderTasks() {
    const list = $("#task-list");
    const tasks = getSelectedTasks();

    list.empty();

    // Shows name for holidays
    const holidayText = holidaysByDate[selectedDate] ? ` (${holidaysByDate[selectedDate]})` : "";
    $("#selected-date").text(`Selected day: ${selectedDate}${holidayText}`);

    // Shows message if there is no tasks
    if (tasks.length === 0) {
        list.append('<li class="empty-task">No tasks for this day yet.</li>');
    }

    tasks.forEach((task, index) => {
        const li = $("<li></li>");
        const span = $("<span></span>");
        const markerButton = $("<button></button>");

        li.addClass("task-item");
        span.addClass("task-text");
        span.text(task.text);

        markerButton.addClass("marker-btn");
        markerButton.attr("type", "button");
        markerButton.attr("data-index", index);
        markerButton.text("✓");

        // If task is completed turns it to green and shows V mark
        if (task.selected) {
            li.addClass("done");
            span.addClass("done");
            markerButton.addClass("active");
        }

        li.append(span);
        li.append(markerButton);
        list.append(li);
    });

    updateCounter();
}

// Renders both the calendar and the task list
function renderAll() {
    renderCalendar();
    renderTasks();
}

// Loads Finnish public holidays from an external API using Axios AJAX., calendar itself doesn't really need externall API
// but it makes Axios more useful and safe holidays inside of calendar
function loadFinnishHolidays(year) {
    $("#ajax-status").text("Loading Finnish holidays...");

    axios.get(`https://date.nager.at/api/v3/PublicHolidays/${year}/FI`)
        .then(response => {
            holidaysByDate = {};

            response.data.forEach(holiday => {
                holidaysByDate[holiday.date] = holiday.localName || holiday.name;
            });

            $("#ajax-status").text("Finnish holidays loaded with Axios AJAX.");
            renderAll();
        })
        .catch(() => {
            $("#ajax-status").text("Could not load holidays. Calendar still works normally.");
        });
}

// All jQuery event listeners are placed inside document.ready
// so they run only after the HTML page has fully loaded
$(document).ready(function () {
    renderAll();
    loadFinnishHolidays(currentDate.getFullYear());

    // Adds a new task to the selected day
    $("#todo-form").on("submit", function (event) {
        event.preventDefault();

        const input = $("#task-input");
        const value = input.val();
        const error = validateTask(value);

        if (error) {
            showError(error);
            return;
        }

        clearError();

        const newTask = {
            id: Date.now(),
            text: value.trim(),
            selected: false
        };

        getSelectedTasks().push(newTask);
        saveTasks();
        renderAll();
        input.val("");
    });

    // Clears validation error while user types
    $("#task-input").on("input", clearError);

    // Selects a day from the calendar.
    $("#calendar").on("click", ".day-btn", function () {
        selectedDate = $(this).attr("data-date");
        clearError();
        renderAll();
    });

    // Marks a task as completed or not completed
    $("#task-list").on("click", ".marker-btn", function () {
        const index = Number($(this).attr("data-index"));
        const tasks = getSelectedTasks();

        tasks[index].selected = !tasks[index].selected;
        saveTasks();
        renderAll();
    });

    // Deletes only selected/completed tasks from the selected day
    $("#delete-selected").on("click", function () {
        tasksByDate[selectedDate] = getSelectedTasks().filter(task => !task.selected);
        saveTasks();
        renderAll();
    });

    // Clears all tasks from the selected day, not from the whole month
    $("#clear-all").on("click", function () {
        tasksByDate[selectedDate] = [];
        saveTasks();
        renderAll();
    });

    // Shows previous month
    $("#prev-month").on("click", function () {
        const oldYear = currentDate.getFullYear();

        currentDate.setMonth(currentDate.getMonth() - 1);

        // By changing year it makes also holidays load for it
        if (currentDate.getFullYear() !== oldYear) {
            loadFinnishHolidays(currentDate.getFullYear());
        } else {
            renderCalendar();
        }
    });

    // Shows next month
    $("#next-month").on("click", function () {
        const oldYear = currentDate.getFullYear();

        currentDate.setMonth(currentDate.getMonth() + 1);

        // I want to make it simplier cuz i think there is some way to not repeat this part
        // but not sure how to make it correct
        if (currentDate.getFullYear() !== oldYear) {
            loadFinnishHolidays(currentDate.getFullYear());
        } else {
            renderCalendar();
        }
    });

    // Goes back to today's 
    $("#today-btn").on("click", function () {
        const today = new Date();

        currentDate = new Date(today.getFullYear(), today.getMonth(), 1);
        selectedDate = formatDate(today);

        loadFinnishHolidays(currentDate.getFullYear());
        clearError();
        renderAll();
    });
});
