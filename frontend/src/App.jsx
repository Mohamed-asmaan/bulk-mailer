import heroImg from './assets/hero.png'
import axios from "axios"
import './App.css'
import { useState } from 'react'
import * as XLSX from "xlsx"

const RAILWAY_API_ORIGIN = 'https://bulk-mailer-production-c860.up.railway.app'
const API_BASE = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? RAILWAY_API_ORIGIN : 'http://localhost:5000')
).replace(/\/$/, '')

function App() {

  const [msg, setmsg] = useState("")
  const [status, setstatus] = useState(false)
  const [emailList, setemailList] = useState([])



  function handlemsg(evt) {
    setmsg(evt.target.value)
  }

  function send() {
    setstatus(true)
    axios.post(`${API_BASE}/sendmail`, {
      msg: msg,
      emailList: emailList
    }).then((data) => {
      if (data.data === true) {
        alert("Email sent successfully")
        setstatus(false)
      }
      else {
        alert("failed")
      }
    })
  }

  function handleFile(evt) {
  const file = evt.target.files[0];

  const reader = new FileReader();

  reader.onload = function (e) {

    const data = new Uint8Array(e.target.result);

    const workbook = XLSX.read(data, {
      type: "array"
    });

    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const emailList =   XLSX.utils.sheet_to_json(worksheet, { header: 'A' })
    const totalemail = emailList.map((item)=>{
      return (item.A)
    })

    setemailList(totalemail)

    console.log(workbook);
    console.log(worksheet);
    console.log(emailList);

  }

  reader.readAsArrayBuffer(file);
}


    return (
      <div className='min-h-screen bg-[#06142b] relative overflow-hidden flex items-center justify-center px-6 pt-12 pb-[max(3rem,env(safe-area-inset-bottom,0px))]'>

        {/* Background Blur */}
        <div className='absolute top-[-120px] left-[-120px] w-[350px] h-[350px] bg-blue-500/20 blur-3xl rounded-full'></div>
        <div className='absolute bottom-[-120px] right-[-120px] w-[350px] h-[350px] bg-cyan-400/20 blur-3xl rounded-full'></div>

        {/* Card */}
        <main className='relative w-full max-w-6xl bg-white/10 backdrop-blur-xl border border-white/10 rounded-[32px] shadow-[0_20px_80px_rgba(0,0,0,0.45)] overflow-hidden'>

          {/* Header */}
          <div className='border-b border-white/10 px-8 md:px-12 py-7 flex items-center justify-between'>

            <div>
              <h1 className='text-3xl md:text-4xl font-bold text-white tracking-tight'>
                Bulk Mail
              </h1>

              <p className='text-blue-100/70 mt-2 text-sm md:text-base'>
                Upload Excel files and launch email campaigns instantly
              </p>
            </div>

            <div className='hidden md:flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/10'>
              <div className='w-2 h-2 bg-green-400 rounded-full animate-pulse'></div>
              <span className='text-white text-sm'>
                Ready to send
              </span>
            </div>

          </div>

          {/* Content */}
          <div className='grid lg:grid-cols-2 gap-10 p-8 md:p-12 items-center'>

            {/* Left */}
            <div className='flex flex-col gap-6'>

              <div>

                <div className='inline-flex items-center gap-2 bg-blue-500/10 border border-blue-400/20 text-blue-200 px-4 py-2 rounded-full text-sm mb-5'>
                  ⚡ Smart Email Campaign
                </div>

                <h2 className='text-4xl font-bold text-white leading-tight'>
                  Send thousands of emails with a beautiful workflow
                </h2>

                <p className='text-white/60 mt-4 leading-relaxed text-lg'>
                  Upload your Excel contacts, write your message, and deliver personalized campaigns effortlessly.
                </p>

              </div>

              {/* Textarea */}
              <div className='bg-white/5 border border-white/10 rounded-3xl p-4 backdrop-blur-md'>

                <div className='flex items-center justify-between mb-3'>
                  <p className='text-white font-medium'>
                    Email Content
                  </p>

                  <span className='text-xs text-white/40'>
                    Rich message editor
                  </span>
                </div>

                <textarea
                  onChange={handlemsg} value={msg}
                  className='w-full h-52 bg-transparent text-white placeholder:text-white/35 outline-none resize-none rounded-xl focus-visible:ring-2 focus-visible:ring-cyan-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white/5'
                  placeholder='Write your campaign email here...'
                />

              </div>

              {/* Upload Area */}
              <label htmlFor='fileInput' className='group relative border border-dashed border-blue-400/30 bg-blue-500/5 rounded-3xl p-10 flex flex-col items-center justify-center cursor-pointer transition hover:bg-blue-500/10 overflow-hidden'>

                <div className='absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-br from-blue-500/10 to-cyan-400/10'></div>

                <input
                  onChange={handleFile}
                  type='file'
                  id='fileInput'
                  className='hidden'
                />

                <div className='relative z-10 text-6xl mb-4'>
                  📂
                </div>

                <p className='relative z-10 text-xl font-semibold text-white text-center'>
                  Upload Excel File
                </p>

                <span className='relative z-10 text-sm text-white/50 mt-2'>
                  Drag & drop or click to browse
                </span>

                <div className='relative z-10 mt-5 bg-white/10 border border-white/10 px-4 py-2 rounded-full text-sm text-blue-100'>
                  Total emails in file: {emailList.length}
                </div>

              </label>

              {/* Button */}
              <button type='button' onClick={send} className='group relative overflow-hidden bg-gradient-to-r from-blue-600 to-cyan-500 hover:scale-[1.02] active:scale-[0.99] transition-all duration-300 text-white py-5 rounded-3xl text-lg font-semibold shadow-[0_10px_40px_rgba(59,130,246,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06142b]'>

                <div className='absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition'></div>

                <span className='relative z-10 flex items-center justify-center gap-3'>
                  {status ? 'Sending…' : '🚀 Send Bulk Emails'}
                </span>

              </button>

            </div>

            {/* Right */}
            <div className='relative flex items-center justify-center'>

              {/* Glow */}
              <div className='absolute w-[320px] h-[320px] bg-cyan-400/20 blur-3xl rounded-full'></div>

              {/* Floating Card */}
              <div className='absolute top-6 right-4 bg-white/10 backdrop-blur-md border border-white/10 px-5 py-4 rounded-2xl shadow-xl hidden lg:block'>
                <p className='text-white text-sm font-medium'>
                  Emails Delivered
                </p>

                <h3 className='text-3xl font-bold text-cyan-300 mt-1'>
                  12.4K
                </h3>
              </div>

              <img
                src={heroImg}
                alt='Illustration representing bulk email delivery'
                className='relative z-10 w-full max-w-lg object-contain drop-shadow-[0_25px_50px_rgba(0,0,0,0.45)]'
                decoding='async'
              />

            </div>

          </div>

        </main>

      </div>
    )
  }

  export default App