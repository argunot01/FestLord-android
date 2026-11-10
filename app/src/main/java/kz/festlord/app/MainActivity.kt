package kz.festlord.app

import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.media.MediaPlayer
import android.net.Uri
import android.os.Bundle
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.widget.*
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

private data class Exercise(
    val id: String,
    val name: String,
    val type: String,
    val amount: Int,
    val sets: Int,
    val weight: Double
)

class MainActivity : Activity() {
    private val gold = Color.rgb(231, 188, 94)
    private val darkGold = Color.rgb(158, 113, 47)
    private val bg = Color.rgb(11, 16, 22)
    private val panel = Color.rgb(25, 33, 39)
    private val faint = Color.rgb(170, 180, 181)
    private lateinit var prefs: android.content.SharedPreferences
    private lateinit var root: LinearLayout
    private lateinit var body: LinearLayout
    private var player: MediaPlayer? = null
    private var tab = "Герой"
    private var heroStyle = 1
    private val exercises = mutableListOf<Exercise>()
    private val day: String get() = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = getSharedPreferences("festlord", MODE_PRIVATE)
        heroStyle = prefs.getInt("style", 1)
        loadExercises()
        render("Герой")
    }

    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()
    private fun currentXp() = prefs.getInt("xp", 0)
    private fun level() = 1 + currentXp() / 200
    private fun stage() = when (level()) { in 1..10 -> 1; in 11..25 -> 2; in 26..49 -> 3; in 50..74 -> 4; else -> 5 }
    private fun rank() = when (stage()) {
        1 -> "Худой новичок"; 2 -> "Ученик"; 3 -> "Степной воин"; 4 -> "Батыр"; else -> "Легенда Турана"
    }

    private fun background(color: Int = panel, radius: Int = 16, line: Boolean = false) =
        GradientDrawable().apply {
            setColor(color)
            cornerRadius = dp(radius).toFloat()
            if (line) setStroke(dp(1), darkGold)
        }

    private fun text(value: String, size: Float = 16f, color: Int = Color.WHITE, bold: Boolean = false) =
        TextView(this).apply {
            this.text = value
            textSize = size
            setTextColor(color)
            if (bold) setTypeface(null, Typeface.BOLD)
            setPadding(dp(6), dp(5), dp(6), dp(5))
        }

    private fun card(): LinearLayout = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(dp(12), dp(12), dp(12), dp(12))
        background = background(line = true)
        val params = LinearLayout.LayoutParams(-1, -2)
        params.setMargins(0, dp(7), 0, dp(7))
        layoutParams = params
    }

    private fun action(label: String, enabled: Boolean = true, onClick: () -> Unit): Button =
        Button(this).apply {
            text = label
            textSize = 13f
            isAllCaps = false
            setTextColor(if (enabled) Color.rgb(21, 24, 27) else Color.GRAY)
            background = GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, intArrayOf(gold, darkGold)).apply {
                cornerRadius = dp(12).toFloat()
            }
            isEnabled = enabled
            setOnClickListener { onClick() }
        }

    private fun addCard(populate: LinearLayout.() -> Unit) {
        val box = card()
        box.populate()
        body.addView(box)
    }

    private fun render(selected: String) {
        tab = selected
        root = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setBackgroundColor(bg) }
        setContentView(root)
        val header = LinearLayout(this).apply {
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(14), dp(8), dp(14), dp(8))
        }
        header.addView(text("⚔  BATYR'S WAY", 21f, gold, true), LinearLayout.LayoutParams(0, -2, 1f))
        header.addView(text("LVL ${level()}", 14f, gold, true))
        root.addView(header)

        val scroll = ScrollView(this).apply { isFillViewport = false }
        body = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(14), 0, dp(14), dp(22)) }
        scroll.addView(body)
        root.addView(scroll, LinearLayout.LayoutParams(-1, 0, 1f))
        when (selected) {
            "Герой" -> hero()
            "Тренировка" -> workout()
            "Задания" -> quests()
            "Музыка" -> music()
            "Прогресс" -> progress()
        }
        val navigation = LinearLayout(this).apply {
            gravity = Gravity.CENTER
            setBackgroundColor(Color.rgb(19, 25, 31))
        }
        listOf("Герой", "Тренировка", "Задания", "Музыка", "Прогресс").forEachIndexed { i, name ->
            val icon = listOf("♜", "⚔", "✓", "♫", "▥")[i]
            val item = TextView(this).apply {
                text = "$icon\n$name"
                textSize = 11f
                gravity = Gravity.CENTER
                setPadding(0, dp(11), 0, dp(10))
                setTextColor(if (name == selected) gold else faint)
                setOnClickListener { render(name) }
            }
            navigation.addView(item, LinearLayout.LayoutParams(0, -2, 1f))
        }
        root.addView(navigation)
    }

    private fun hero() {
        val scene = SteppeSceneView(this)
        body.addView(scene, LinearLayout.LayoutParams(-1, dp(165)))
        addCard {
            addView(text("ГЛАВА ${stage()}  •  ${rank().uppercase(Locale.getDefault())}", 19f, gold, true))
            addView(text("Тренируйся в жизни — расти в игре", 13f, faint))
            val bar = ProgressBar(this@MainActivity, null, android.R.attr.progressBarStyleHorizontal).apply {
                max = 200
                progress = currentXp() % 200
                progressTintList = ColorStateList.valueOf(gold)
                progressBackgroundTintList = ColorStateList.valueOf(Color.DKGRAY)
            }
            addView(bar, LinearLayout.LayoutParams(-1, dp(9)))
            addView(text("${currentXp()} XP  •  до следующего уровня ${200 - currentXp() % 200} XP", 13f, faint))
            val model = HeroView(this@MainActivity)
            addView(model, LinearLayout.LayoutParams(-1, dp(325)))
            model.changeStyle(heroStyle)
            model.changeStage(stage())
            addView(text("3D-персонаж • поворачивай пальцем", 12f, faint))
            addView(text("Стиль героя", 15f, gold, true))
            val styles = LinearLayout(this@MainActivity)
            listOf("Атлет", "Воин", "Аниме").forEachIndexed { index, name ->
                val b = action(name) {
                    heroStyle = index
                    prefs.edit().putInt("style", index).apply()
                    model.changeStyle(index)
                }
                styles.addView(b, LinearLayout.LayoutParams(0, dp(47), 1f))
            }
            addView(styles)
            addView(text("В начале герой остаётся слабым. Доспехи и сила появятся по мере роста уровня.", 13f, faint))
        }
        addCard {
            addView(text("СЕГОДНЯШНИЙ ПУТЬ", 19f, gold, true))
            addView(text("${completedSets()} / ${totalSets()} подходов выполнено"))
            addView(action("Начать тренировку") { render("Тренировка") })
        }
    }

    private fun loadExercises() {
        exercises.clear()
        val stored = prefs.getString("custom_exercises_v1", null)
        if (stored == null) {
            exercises.add(Exercise(UUID.randomUUID().toString(), "Отжимания", "Повторения", 15, 1, 0.0))
            exercises.add(Exercise(UUID.randomUUID().toString(), "Приседания", "Повторения", 15, 2, 0.0))
            exercises.add(Exercise(UUID.randomUUID().toString(), "Планка", "Секунды", 30, 1, 0.0))
            saveExercises()
            return
        }
        try {
            val array = JSONArray(stored)
            for (i in 0 until array.length()) {
                val value = array.getJSONObject(i)
                exercises.add(Exercise(
                    value.getString("id"), value.getString("name"),
                    value.optString("type", "Повторения"),
                    value.optInt("amount", 10).coerceAtLeast(1),
                    value.optInt("sets", 1).coerceIn(1, 12),
                    value.optDouble("weight", 0.0).coerceAtLeast(0.0)
                ))
            }
        } catch (_: Exception) {
            Toast.makeText(this, "Не удалось загрузить упражнения", Toast.LENGTH_LONG).show()
        }
    }

    private fun saveExercises() {
        val array = JSONArray()
        exercises.forEach {
            array.put(JSONObject().apply {
                put("id", it.id); put("name", it.name); put("type", it.type)
                put("amount", it.amount); put("sets", it.sets); put("weight", it.weight)
            })
        }
        prefs.edit().putString("custom_exercises_v1", array.toString()).apply()
    }

    private fun setKey(exercise: Exercise, set: Int) = "completed_${day}_${exercise.id}_$set"
    private fun awardedKey(exercise: Exercise, set: Int) = "awarded_${day}_${exercise.id}_$set"
    private fun completedSets() = exercises.sumOf { ex -> (1..ex.sets).count { prefs.getBoolean(setKey(ex, it), false) } }
    private fun totalSets() = exercises.sumOf { it.sets }
    private fun todayXp() = prefs.getInt("earned_$day", 0)

    private fun mark(exercise: Exercise, set: Int, checked: Boolean) {
        val key = setKey(exercise, set)
        prefs.edit().putBoolean(key, checked).apply()
        if (checked && !prefs.getBoolean(awardedKey(exercise, set), false)) {
            val gained = (120 - todayXp()).coerceIn(0, 12)
            prefs.edit().putBoolean(awardedKey(exercise, set), true)
                .putInt("earned_$day", todayXp() + gained)
                .putInt("xp", currentXp() + gained).apply()
            Toast.makeText(this, if (gained > 0) "+$gained XP" else "Лимит XP за подходы на сегодня достигнут", Toast.LENGTH_SHORT).show()
        }
    }

    private fun workout() {
        addCard {
            addView(text("⚔  МОЯ ТРЕНИРОВКА", 22f, gold, true))
            addView(text("Сам выбирай упражнения, нагрузку и число подходов.", 14f, faint))
            addView(text("Выполнено ${completedSets()} / ${totalSets()} подходов  •  ${todayXp()} / 120 XP за подходы", 13f, gold))
            val actions = LinearLayout(this@MainActivity)
            actions.addView(action("+ Добавить упражнение") { chooseExercise() }, LinearLayout.LayoutParams(0, dp(55), 1f))
            actions.addView(action("Изменить план") { manageExercises() }, LinearLayout.LayoutParams(0, dp(55), 1f))
            addView(actions)
        }
        if (exercises.isEmpty()) {
            addCard { addView(text("План пуст. Добавь первое упражнение — например, 15 отжиманий.")) }
        }
        exercises.forEachIndexed { index, exercise ->
            addCard {
                addView(text("${index + 1}. ${exercise.name}", 18f, gold, true))
                val details = if (exercise.weight > 0) "  •  ${exercise.weight} кг" else ""
                addView(text("${exercise.sets} подход(ов) × ${exercise.amount} ${if (exercise.type == "Секунды") "сек." else "раз"}$details", 14f, faint))
                repeat(exercise.sets) { indexOfSet ->
                    val set = indexOfSet + 1
                    val box = CheckBox(this@MainActivity).apply {
                        text = "Подход $set — ${exercise.amount} ${if (exercise.type == "Секунды") "сек." else "повторений"}"
                        textSize = 15f
                        buttonTintList = ColorStateList.valueOf(gold)
                        setTextColor(Color.WHITE)
                        isChecked = prefs.getBoolean(setKey(exercise, set), false)
                        setOnCheckedChangeListener { _, checked ->
                            mark(exercise, set, checked)
                        }
                    }
                    addView(box)
                }
                addView(action("▶ Начать упражнение") {
                    val first = (1..exercise.sets).firstOrNull { !prefs.getBoolean(setKey(exercise, it), false) } ?: 1
                    showSession(exercise, first)
                })
                addView(action("Изменить упражнение") { editExercise(exercise) })
            }
        }
        addCard {
            addView(action("🏆 Завершить тренировку") { finishWorkout() })
            addView(text("XP начисляется только один раз за подход. Лимит за подходы — 120 XP в день.", 12f, faint))
        }
    }

    private fun showSession(exercise: Exercise, setNumber: Int) {
        root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(bg)
            setPadding(dp(16), dp(22), dp(16), dp(22))
        }
        setContentView(root)
        root.addView(action("‹ Вернуться к упражнениям") { render("Тренировка") })
        val gap = Space(this)
        root.addView(gap, LinearLayout.LayoutParams(-1, 0, 1f))
        val header = text("ИСПЫТАНИЕ БАТЫРА", 17f, gold, true).apply { gravity = Gravity.CENTER }
        root.addView(header)
        val name = text(exercise.name, 28f, Color.WHITE, true).apply { gravity = Gravity.CENTER }
        root.addView(name)
        root.addView(text("Подход $setNumber из ${exercise.sets}", 16f, faint).apply { gravity = Gravity.CENTER })
        val units = if (exercise.type == "Секунды") "секунд" else "повторений"
        val counterLabel = text("0 / ${exercise.amount}", 40f, gold, true).apply { gravity = Gravity.CENTER }
        root.addView(counterLabel)
        root.addView(text("Цель: ${exercise.amount} $units", 16f, faint).apply { gravity = Gravity.CENTER })
        var count = 0
        val progress = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            max = exercise.amount
            progress = 0
            progressTintList = ColorStateList.valueOf(gold)
        }
        root.addView(progress, LinearLayout.LayoutParams(-1, dp(12)))
        val complete = action("✓ Отметить подход выполненным") {
            mark(exercise, setNumber, true)
            render("Тренировка")
        }
        complete.isEnabled = false
        complete.alpha = .45f
        root.addView(action(if (exercise.type == "Секунды") "+1 секунда" else "+1 повторение") {
            count = (count + 1).coerceAtMost(exercise.amount)
            counterLabel.text = "$count / ${exercise.amount}"
            progress.progress = count
            if (count >= exercise.amount) {
                complete.isEnabled = true
                complete.alpha = 1f
            }
        })
        root.addView(action("Я сделал все ${exercise.amount} $units") {
            count = exercise.amount
            counterLabel.text = "$count / ${exercise.amount}"
            progress.progress = count
            complete.isEnabled = true
            complete.alpha = 1f
        })
        root.addView(complete)
        root.addView(text("Подтверждай только реально выполненное упражнение. Можно остановиться раньше — безопасная нагрузка важнее XP.", 12f, faint))
        root.addView(Space(this), LinearLayout.LayoutParams(-1, 0, 1f))
        root.addView(action("♫ Пауза / музыка") {
            try { player?.let { if (it.isPlaying) it.pause() else it.start() } }
            catch (_: Exception) {}
        })
    }

    private fun chooseExercise() {
        val choices = arrayOf("Отжимания", "Приседания", "Подтягивания", "Жим лёжа", "Становая тяга", "Планка", "Велотренажёр", "Ходьба", "Своё упражнение")
        AlertDialog.Builder(this).setTitle("Выбери упражнение").setItems(choices) { _, index ->
            val name = if (index == choices.lastIndex) "" else choices[index]
            val type = if (name == "Планка" || name == "Велотренажёр" || name == "Ходьба") "Секунды" else "Повторения"
            val value = if (type == "Секунды") 60 else 15
            editExercise(Exercise(UUID.randomUUID().toString(), name, type, value, 1, 0.0), true)
        }.setNegativeButton("Отмена", null).show()
    }

    private fun field(container: LinearLayout, label: String, value: String, numeric: Boolean = false): EditText {
        container.addView(text(label, 13f, gold))
        val input = EditText(this).apply {
            setSingleLine()
            setText(value)
            setTextColor(Color.WHITE)
            setHintTextColor(faint)
            textSize = 16f
            backgroundTintList = ColorStateList.valueOf(gold)
            if (numeric) inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL
        }
        container.addView(input)
        return input
    }

    private fun editExercise(exercise: Exercise, newItem: Boolean = false) {
        val editor = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(18), dp(4), dp(18), 0)
        }
        val nameField = field(editor, "Название упражнения", exercise.name)
        editor.addView(text("Единица задания", 13f, gold))
        val types = arrayOf("Повторения", "Секунды")
        val typeSpinner = Spinner(this).apply {
            adapter = ArrayAdapter(this@MainActivity, android.R.layout.simple_spinner_dropdown_item, types)
            setSelection(types.indexOf(exercise.type).coerceAtLeast(0))
        }
        editor.addView(typeSpinner)
        val amountField = field(editor, "Сколько раз / секунд", exercise.amount.toString(), true)
        val setsField = field(editor, "Количество подходов", exercise.sets.toString(), true)
        val weightField = field(editor, "Вес, кг (необязательно)", if (exercise.weight > 0) exercise.weight.toString() else "", true)
        val dialog = AlertDialog.Builder(this)
            .setTitle(if (newItem) "Новое испытание" else "Изменить упражнение")
            .setView(ScrollView(this).apply { addView(editor) })
            .setNegativeButton("Отмена", null)
            .setPositiveButton("Сохранить", null)
            .create()
        dialog.setOnShowListener {
            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
                val name = nameField.text.toString().trim()
                val amount = amountField.text.toString().toDoubleOrNull()?.toInt()
                val sets = setsField.text.toString().toDoubleOrNull()?.toInt()
                val weight = weightField.text.toString().replace(',', '.').toDoubleOrNull() ?: 0.0
                if (name.isBlank() || amount == null || amount !in 1..10000 || sets == null || sets !in 1..12 || weight !in 0.0..1000.0) {
                    Toast.makeText(this, "Введи название, количество 1–10000 и подходы 1–12", Toast.LENGTH_LONG).show()
                    return@setOnClickListener
                }
                val updated = Exercise(exercise.id, name, types[typeSpinner.selectedItemPosition], amount, sets, weight)
                val oldIndex = exercises.indexOfFirst { it.id == exercise.id }
                if (oldIndex >= 0) exercises[oldIndex] = updated else exercises.add(updated)
                saveExercises()
                dialog.dismiss()
                render("Тренировка")
            }
        }
        dialog.show()
    }

    private fun manageExercises() {
        if (exercises.isEmpty()) { chooseExercise(); return }
        val labels = exercises.map { "${it.name}: ${it.amount} × ${it.sets} подход(ов)" }.toTypedArray()
        AlertDialog.Builder(this).setTitle("Управление упражнениями")
            .setItems(labels) { _, i ->
                val ex = exercises[i]
                AlertDialog.Builder(this).setTitle(ex.name)
                    .setItems(arrayOf("Изменить", "Удалить")) { _, selected ->
                        if (selected == 0) editExercise(ex) else
                            AlertDialog.Builder(this).setMessage("Удалить упражнение «${ex.name}» из плана?")
                                .setPositiveButton("Удалить") { _, _ ->
                                    exercises.removeAll { it.id == ex.id }
                                    saveExercises()
                                    render("Тренировка")
                                }.setNegativeButton("Отмена", null).show()
                    }.show()
            }.setNegativeButton("Закрыть", null).show()
    }

    private fun finishWorkout() {
        if (totalSets() == 0 || completedSets() < totalSets()) {
            Toast.makeText(this, "Отметь выполненные подходы, чтобы завершить испытание", Toast.LENGTH_LONG).show()
            return
        }
        val key = "finished_$day"
        if (prefs.getBoolean(key, false)) {
            AlertDialog.Builder(this).setTitle("Испытание уже завершено").setMessage("Сегодня награда за тренировку получена.").setPositiveButton("Хорошо", null).show()
            return
        }
        prefs.edit().putBoolean(key, true).putInt("xp", currentXp() + 30).apply()
        AlertDialog.Builder(this).setTitle("⚔ Победа! +30 XP")
            .setMessage("Сегодня ты сделал ещё один шаг на пути батыра. Уровень: ${level()}.")
            .setPositiveButton("Посмотреть героя") { _, _ -> render("Герой") }.show()
    }

    private fun quests() {
        addCard {
            addView(text("🏕  ЕЖЕДНЕВНЫЕ ИСПЫТАНИЯ", 22f, gold, true))
            addView(text("Пройди свою тренировку, чтобы заработать дополнительный опыт.", 14f, faint))
            addView(text("Подходы: ${completedSets()} / ${totalSets()}"))
            addView(text("Награда за завершение: +30 XP", 15f, gold, true))
            addView(action(if (prefs.getBoolean("finished_$day", false)) "Награда получена ✓" else "Завершить испытание",
                !prefs.getBoolean("finished_$day", false)) { finishWorkout() })
        }
        addCard {
            addView(text("ЭТАПЫ ВОИНА", 18f, gold, true))
            listOf("1–10: Худой новичок", "11–25: Ученик", "26–49: Степной воин", "50–74: Батыр", "75+: Легенда Турана").forEach {
                addView(text(it, 14f, faint))
            }
        }
    }

    private fun music() {
        addCard {
            addView(text("♫  МУЗЫКА ДЛЯ ТРЕНИРОВКИ", 20f, gold, true))
            addView(text("Музыка продолжит играть при переходе между экранами приложения.", 14f, faint))
            addView(action("Выбрать музыку с телефона") {
                startActivityForResult(Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                    type = "audio/*"
                    addCategory(Intent.CATEGORY_OPENABLE)
                }, 17)
            })
            val url = field(this, "Онлайн-поток (прямая HTTPS-ссылка)", "")
            url.hint = "https://.../audio.mp3"
            addView(action("Слушать онлайн") {
                val value = url.text.toString().trim()
                if (value.startsWith("https://")) playUri(Uri.parse(value))
                else Toast.makeText(this@MainActivity, "Укажи HTTPS-ссылку", Toast.LENGTH_SHORT).show()
            })
            val row = LinearLayout(this@MainActivity)
            row.addView(action("⏯ Пауза / Играть") {
                try {
                    player?.let { if (it.isPlaying) it.pause() else it.start() }
                } catch (_: Exception) { Toast.makeText(this@MainActivity, "Выбери трек заново", Toast.LENGTH_SHORT).show() }
            }, LinearLayout.LayoutParams(0, dp(50), 1f))
            row.addView(action("■ Стоп") { player?.release(); player = null }, LinearLayout.LayoutParams(0, dp(50), 1f))
            addView(row)
            addView(text("Spotify и другие сервисы пока не подключены.", 12f, faint))
        }
    }

    private fun progress() {
        addCard {
            addView(text("▥  МОЙ ПРОГРЕСС", 22f, gold, true))
            addView(text("Уровень: ${level()}   •   ${currentXp()} XP"))
            addView(text("Ранг: ${rank()}"))
            addView(text("Заполнено подходов сегодня: ${completedSets()}"))
            addView(text("Цель по массе тела: ${prefs.getFloat("goal", 100f)} кг", 14f, faint))
            val weight = field(this, "Текущий вес, кг", if (prefs.contains("weight")) prefs.getFloat("weight", 125f).toString() else "125", true)
            val goal = field(this, "Целевой вес, кг", prefs.getFloat("goal", 100f).toString(), true)
            addView(action("Сохранить показатели") {
                val w = weight.text.toString().replace(',', '.').toFloatOrNull()
                val g = goal.text.toString().replace(',', '.').toFloatOrNull()
                if (w != null && g != null && w in 25f..400f && g in 25f..400f) {
                    prefs.edit().putFloat("weight", w).putFloat("goal", g).apply()
                    Toast.makeText(this@MainActivity, "Показатели сохранены", Toast.LENGTH_SHORT).show()
                    render("Прогресс")
                } else Toast.makeText(this@MainActivity, "Укажи вес от 25 до 400 кг", Toast.LENGTH_LONG).show()
            })
        }
    }

    private fun playUri(uri: Uri) {
        try {
            player?.release()
            player = MediaPlayer().apply {
                setDataSource(this@MainActivity, uri)
                setOnPreparedListener { it.start() }
                setOnErrorListener { _, _, _ ->
                    Toast.makeText(this@MainActivity, "Ошибка воспроизведения", Toast.LENGTH_LONG).show()
                    true
                }
                prepareAsync()
            }
        } catch (error: Exception) {
            Toast.makeText(this, "Ошибка аудио: ${error.message}", Toast.LENGTH_LONG).show()
        }
    }

    @Deprecated("Uses legacy document picker callback")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == 17 && resultCode == RESULT_OK) data?.data?.let { playUri(it) }
    }

    override fun onDestroy() {
        player?.release()
        super.onDestroy()
    }
}
