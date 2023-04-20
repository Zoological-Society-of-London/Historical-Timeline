$("body").on("click", ".start-quiz-button", (e) => {

    e.preventDefault();

    let wrapper = $(e.currentTarget).closest("form");

    let first = wrapper.find(".question-wrapper").first();

    $(wrapper).append(first);

    //console.log(first);

})

// hide the inputs, show the answers
$("body").on("click", ".quiz-reveal-button", (e) => {

    e.preventDefault();
    
    $(".answers-with-highlighting").show();
    $(".answers-with-input").hide();


})

$("body").on("click", ".quiz-next-button", (e) => {

    // hide the answers, show the inputs
    $(".answers-with-highlighting").hide();
    $(".answers-with-input").show();

    e.preventDefault();

    let wrapper = $(e.currentTarget).closest("form");

    let first = wrapper.find(".question-wrapper").first();

    $(wrapper).append(first);

})

$("body").on("click", ".quiz-previous-button", (e) => {

    e.preventDefault();

    let wrapper = $(e.currentTarget).closest("form");

    let last = wrapper.find(".question-wrapper").last();

    $(wrapper).prepend(last);

})

$("body").on("click", "#check-quiz-answers", (e) => {

    e.preventDefault();

    let checked = Array.from(document.querySelectorAll(".answer-wrapper input:checked"));

    let total = 0;

    checked.forEach((answer) => {

        total += parseInt(answer.value);

    })

    let quizId = window.timeline.currentTheme.quiz.quizId;

    $.get("/api/quiz/" + quizId + "/" + total, function (message) {

        window.timeline.quiz_modal.setContent(message);

    })

})