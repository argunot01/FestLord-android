package kz.festlord.app

import android.app.Activity
import android.os.Bundle
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.media.MediaPlayer
import android.net.Uri
import android.view.Gravity
import android.view.View
import android.widget.*
import android.graphics.drawable.GradientDrawable

class MainActivity : Activity() {
 private val gold = Color.rgb(225,185,83)
 private val bg = Color.rgb(15,18,25)
 private val panel = Color.rgb(31,35,45)
 private lateinit var root: LinearLayout
 private lateinit var content: LinearLayout
 private lateinit var prefs: android.content.SharedPreferences
 private var player: MediaPlayer? = null
 private val exercises = listOf("Жим лёжа — 4 подхода", "Приседания — 3 подхода", "Становая тяга — 3 подхода", "Кардио — 20 минут")
 private var currentTab="Герой"
 private var heroStyle=0
 override fun onCreate(savedInstanceState: Bundle?) {
  super.onCreate(savedInstanceState)
  prefs=getSharedPreferences("festlord",MODE_PRIVATE)
  heroStyle=prefs.getInt("style",0)
  show("Герой")
 }
 private fun txt(label:String,size:Float=17f,color:Int=Color.WHITE):TextView =
  TextView(this).apply { text=label; textSize=size; setTextColor(color); setPadding(12,12,12,12) }
 private fun card():LinearLayout = LinearLayout(this).apply {
  orientation=LinearLayout.VERTICAL
  setPadding(15,15,15,15)
  background=GradientDrawable().apply { setColor(panel); cornerRadius=24f }
  val lp=LinearLayout.LayoutParams(-1,-2); lp.setMargins(8,8,8,8); layoutParams=lp
 }
 private fun button(label:String,action:()->Unit):Button = Button(this).apply {
  text=label; setTextColor(Color.BLACK); setBackgroundColor(gold); setOnClickListener { action() }
 }
 private fun addCard(block:LinearLayout.()->Unit) { val c=card(); c.block();content.addView(c) }
 private fun score():Int = prefs.getInt("xp",0)
 private fun level():Int = 1+score()/250
 private fun show(tab:String) {
  currentTab=tab
  root=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL;setBackgroundColor(bg)}
  setContentView(root)
  root.addView(txt("⚔  BATYR'S WAY",25f,gold))
  val scroll=ScrollView(this)
  content=LinearLayout(this).apply { orientation=LinearLayout.VERTICAL;setPadding(9,3,9,3) }
  scroll.addView(content)
  root.addView(scroll,LinearLayout.LayoutParams(-1,0,1f))
  when(tab){
   "Герой" -> hero()
   "Тренировка" -> workout()
   "Задания" -> quests()
   "Музыка" -> music()
   "Прогресс" -> progress()
  }
  val nav=LinearLayout(this).apply { orientation=LinearLayout.HORIZONTAL }
  listOf("Герой","Тренировка","Задания","Музыка","Прогресс").forEach { label ->
   val b=TextView(this).apply {
    text=label; textSize=11f; gravity=Gravity.CENTER; setPadding(2,20,2,20)
    setTextColor(if (label==tab) gold else Color.LTGRAY)
    setOnClickListener{show(label)}
   }
   nav.addView(b,LinearLayout.LayoutParams(0,-2,1f))
  }
  root.addView(nav)
 }
 private fun hero() {
  addCard {
   addView(txt("Лорд • Уровень ${level()}",23f,gold))
   addView(txt("Опыт: ${score()} XP  •  до следующего уровня: ${250-score()%250} XP"))
   val hero=HeroView(this@MainActivity)
   addView(hero,LinearLayout.LayoutParams(-1,540))
   hero.changeStyle(heroStyle)
   addView(txt("Вращай героя пальцем. Выбери стиль:"))
   val row=LinearLayout(this@MainActivity)
   listOf("Атлет","Воин","Аниме").forEachIndexed {i,label->
    row.addView(button(label){ heroStyle=i;prefs.edit().putInt("style",i).apply();hero.changeStyle(i)},LinearLayout.LayoutParams(0,-2,1f))
   }
   addView(row)
  }
  addCard {
   addView(txt("⚡ Сила: ${prefs.getInt("strength",0)}"))
   addView(txt("❤ Выносливость: ${prefs.getInt("endurance",0)}"))
   addView(txt("🏆 Достижения: ${score()/250} повышений уровня"))
  }
 }
 private fun workout() {
  addCard {
   addView(txt("Тренировка дня",22f,gold))
   addView(txt("Отмечай каждый подход после выполнения. За каждое упражнение начисляется XP только один раз в день."))
   val today=java.text.SimpleDateFormat("yyyy-MM-dd",java.util.Locale.US).format(java.util.Date())
   exercises.forEachIndexed {i,name->
    val key="done_${today}_${i}"
    val box=CheckBox(this@MainActivity).apply{
     text=name+"  (+25 XP)"
     setTextColor(Color.WHITE)
     isChecked=prefs.getBoolean(key,false)
     setOnCheckedChangeListener{_,checked->
      if(checked && !prefs.getBoolean(key,false)){
       prefs.edit().putBoolean(key,true).putInt("xp",score()+25).putInt(if(i==3)"endurance" else "strength",prefs.getInt(if(i==3)"endurance" else "strength",0)+1).apply()
       Toast.makeText(this@MainActivity,"+25 XP!",Toast.LENGTH_SHORT).show()
      }else if(!checked && prefs.getBoolean(key,false)){
       isChecked=true
       Toast.makeText(this@MainActivity,"Награда уже получена сегодня",Toast.LENGTH_SHORT).show()
      }
     }
    }
    addView(box)
   }
  }
 }
 private fun quests() {
  val today=java.text.SimpleDateFormat("yyyy-MM-dd",java.util.Locale.US).format(java.util.Date())
  val count=exercises.indices.count {prefs.getBoolean("done_${today}_${it}",false)}
  addCard {
   addView(txt("Задание: Испытание силы",22f,gold))
   addView(txt("Выполнено упражнений: $count из ${exercises.size}"))
   addView(button("Завершить испытание • +50 XP"){
    if(count==exercises.size && !prefs.getBoolean("bonus_$today",false)){
     prefs.edit().putBoolean("bonus_$today",true).putInt("xp",score()+50).apply()
     Toast.makeText(this@MainActivity,"Испытание завершено! +50 XP",Toast.LENGTH_LONG).show()
     show("Задания")
    } else {
     Toast.makeText(this@MainActivity,if(count<exercises.size)"Сначала выполни все упражнения" else "Сегодня награда уже получена",Toast.LENGTH_LONG).show()
    }
   })
  }
 }
 private fun music() {
  addCard {
   addView(txt("🎵 Batyr's Way Music",22f,gold))
   addView(txt("Выбирай музыку с телефона или введи прямую HTTPS-ссылку на аудиопоток."))
   addView(button("Выбрать музыку с телефона"){
    val intent=Intent(Intent.ACTION_OPEN_DOCUMENT).apply { type="audio/*";addCategory(Intent.CATEGORY_OPENABLE)}
    startActivityForResult(intent,17)
   })
   val url=EditText(this@MainActivity).apply { hint="https://.../stream.mp3";setTextColor(Color.WHITE);setHintTextColor(Color.LTGRAY);setSingleLine() }
   addView(url)
   addView(button("Слушать онлайн"){
    val address=url.text.toString().trim()
    if(address.startsWith("https://"))playUri(Uri.parse(address))
    else Toast.makeText(this@MainActivity,"Укажи HTTPS-ссылку на аудиопоток",Toast.LENGTH_SHORT).show()
   })
   addView(button("⏯ Пауза / Продолжить"){
    player?.let {if(it.isPlaying)it.pause() else it.start()}
   })
   addView(button("■ Стоп"){player?.stop();player?.release();player=null})
   addView(txt("Интеграции Spotify, Apple Music и YouTube Music запланированы для следующих версий.",14f))
  }
 }
 private fun progress() {
  addCard {
   addView(txt("📈 Мой прогресс",22f,gold))
   addView(txt("Текущий уровень: ${level()}"))
   addView(txt("Получено XP: ${score()}"))
   addView(txt("Цель по весу: 100 кг"))
   val entry=EditText(this@MainActivity).apply {
    inputType=android.text.InputType.TYPE_CLASS_NUMBER or android.text.InputType.TYPE_NUMBER_FLAG_DECIMAL
    setText(if(prefs.contains("weight"))prefs.getFloat("weight",125f).toString() else "125")
    setTextColor(Color.WHITE)
   }
   addView(entry)
   addView(button("Сохранить мой вес"){
    val weight=entry.text.toString().toFloatOrNull()
    if(weight!=null && weight in 25f..400f){
     prefs.edit().putFloat("weight",weight).apply()
     Toast.makeText(this@MainActivity,"Вес сохранён",Toast.LENGTH_SHORT).show()
    }
   })
  }
 }
 private fun playUri(uri:Uri){
  try {
   player?.release()
   player=MediaPlayer().apply {
    setDataSource(this@MainActivity,uri)
    setOnPreparedListener { it.start() }
    setOnErrorListener { _,_,_ -> Toast.makeText(this@MainActivity,"Не удалось воспроизвести аудио",Toast.LENGTH_LONG).show();true }
    prepareAsync()
   }
  }catch(e:Exception){Toast.makeText(this,"Ошибка аудио: ${e.message}",Toast.LENGTH_LONG).show()}
 }
 override fun onActivityResult(requestCode:Int,resultCode:Int,data:Intent?){
  super.onActivityResult(requestCode,resultCode,data)
  if(requestCode==17&&resultCode==RESULT_OK) data?.data?.let {playUri(it)}
 }
 override fun onDestroy(){player?.release();super.onDestroy()}
}
