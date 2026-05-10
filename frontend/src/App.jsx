import heroImg from './assets/hero.png'
import axios from "axios"
import './App.css'
import { useState } from 'react'
import * as XLSX from "xlsx"

const RAILWAY_API_ORIGIN = 'https://bulk-mailer-production-c860.up.railway.app'
/** Dev: vite.config.js proxies /sendmail and /health → http://localhost:5000 (same-origin, avoids CORS clutter in Network). Prod: Railway / VITE_API_URL. */
const API_BASE = import.meta.env.DEV
  ? ''
  : (
      import.meta.env.VITE_API_URL ||
      (import.meta.env.PROD ? RAILWAY_API_ORIGIN : 'http://localhost:5000')
    ).replace(/\/$/, '')

/** Ask intermediaries not to reuse cached responses — clearer DevTools Headers / fewer “provisional” quirks. */
const API_AXIOS_CONFIG = {
  headers: {
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
  },
}

function App() {

  const [msg, setmsg] = useState("")
  const [status, setstatus] = useState(false)
  const [emailList, setemailList] = useState([])



  function handlemsg(evt) {
    setmsg(evt.target.value)
  }

  function send() {
    setstatus(true)
    axios
      .post(
        `${API_BASE}/sendmail`,
        {
          msg: msg,
          emailList: emailList,
        },
        API_AXIOS_CONFIG,
      )
      .then((res) => {
        if (res.data === true) {
          alert("Email sent successfully")
        } else {
          alert("Send failed — check backend logs.")
        }
      })
      .catch((err) => {
        console.error(err)
        const isNetwork =
          err.code === "ERR_NETWORK" || err.message?.toLowerCase().includes("network")
        alert(
          isNetwork
            ? "Cannot reach API (blocked by browser or backend down — check CORS and Railway)."
            : "Request failed: " + (err.response?.data?.message || err.message || "unknown"),
        )
      })
      .finally(() => setstatus(false))
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
      <div
        className='min-h-[100dvh] min-h-screen bg-[#06142b] relative overflow-hidden flex flex-col lg:items-center lg:justify-center px-4 sm:px-6 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-[max(1rem,env(safe-area-inset-bottom,0px))] lg:pb-[max(3rem,env(safe-area-inset-bottom,0px))]'
      >

        {/* Background Blur */}
        <div className='absolute top-[-60px] sm:top-[-120px] left-[-60px] sm:left-[-120px] w-[220px] h-[220px] sm:w-[350px] sm:h-[350px] bg-blue-500/20 blur-3xl rounded-full pointer-events-none' />
        <div className='absolute bottom-[-60px] sm:bottom-[-120px] right-[-60px] sm:right-[-120px] w-[220px] h-[220px] sm:w-[350px] sm:h-[350px] bg-cyan-400/20 blur-3xl rounded-full pointer-events-none' />

        {/* Card */}
        <main className='relative w-full max-w-6xl mx-auto lg:mx-0 mt-4 mb-8 lg:my-0 flex-1 flex flex-col min-h-0 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-3xl shadow-[0_20px_80px_rgba(0,0,0,0.45)] overflow-hidden'>

          {/* Header */}
          <div className='border-b border-white/10 px-4 sm:px-8 md:px-12 py-5 sm:py-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>

            <div className='min-w-0'>
              <h1 className='text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight'>
                Bulk Mail
              </h1>

              <p className='text-blue-100/70 mt-1 sm:mt-2 text-xs sm:text-sm md:text-base leading-snug'>
                Upload Excel files and launch email campaigns instantly
              </p>
            </div>

            <div className='flex items-center gap-2 bg-white/10 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-white/10 self-start sm:self-center shrink-0'>
              <div className={`w-2 h-2 rounded-full shrink-0 ${status ? 'bg-amber-400 animate-pulse' : 'bg-green-400'}`} />
              <span className='text-white text-xs sm:text-sm whitespace-nowrap'>
                {status ? 'Sending…' : 'Ready to send'}
              </span>
            </div>

          </div>

          {/* Content */}
          <div className='grid lg:grid-cols-2 gap-6 lg:gap-10 p-4 sm:p-8 md:p-12 lg:items-center'>

            {/* Left */}
            <div className='flex flex-col gap-5 sm:gap-6 min-w-0'>

              <div className='min-w-0'>

                <div className='inline-flex items-center gap-2 bg-blue-500/10 border border-blue-400/20 text-blue-200 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm mb-3 sm:mb-5 max-w-full'>
                  <span className='truncate'>⚡ Smart Email Campaign</span>
                </div>

                <h2 className='text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight tracking-tight'>
                  Send thousands of emails with a beautiful workflow
                </h2>

                <p className='text-white/60 mt-3 sm:mt-4 leading-relaxed text-sm sm:text-base lg:text-lg'>
                  Upload your Excel contacts, write your message, and deliver personalized campaigns effortlessly.
                </p>

              </div>

              {/* Textarea */}
              <div className='bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl p-3 sm:p-4 backdrop-blur-md'>

                <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2 sm:mb-3'>
                  <p className='text-white font-medium text-sm sm:text-base'>
                    Email Content
                  </p>

                  <span className='text-[11px] sm:text-xs text-white/40'>
                    Plain text — min 16px on mobile
                  </span>
                </div>

                <textarea
                  onChange={handlemsg} value={msg}
                  rows={6}
                  className='w-full min-h-[10rem] sm:min-h-[13rem] sm:h-52 bg-transparent text-white text-base leading-relaxed placeholder:text-white/35 outline-none resize-none rounded-xl focus-visible:ring-2 focus-visible:ring-cyan-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white/5'
                  placeholder='Write your campaign email here...'
                  autoComplete='off'
                />

              </div>

              {/* Upload Area */}
              <label htmlFor='fileInput' className='group relative border border-dashed border-blue-400/30 bg-blue-500/5 rounded-2xl sm:rounded-3xl p-6 sm:p-10 flex flex-col items-center justify-center cursor-pointer transition-colors hover:bg-blue-500/10 active:bg-blue-500/15 overflow-hidden min-h-[140px] sm:min-h-0 touch-manipulation'>

                <div className='absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-br from-blue-500/10 to-cyan-400/10'></div>

                <input
                  onChange={handleFile}
                  type='file'
                  id='fileInput'
                  accept='.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel'
                  className='hidden'
                />

                <div className='relative z-10 text-4xl sm:text-6xl mb-3 sm:mb-4 select-none' aria-hidden>
                  📂
                </div>

                <p className='relative z-10 text-base sm:text-xl font-semibold text-white text-center px-2'>
                  Upload Excel File
                </p>

                <span className='relative z-10 text-xs sm:text-sm text-white/50 mt-2 text-center px-2'>
                  Tap to browse (Excel)
                </span>

                <div className='relative z-10 mt-4 sm:mt-5 bg-white/10 border border-white/10 px-4 py-2 rounded-full text-xs sm:text-sm text-blue-100'>
                  Total emails in file: {emailList.length}
                </div>

              </label>

              {/* Button */}
              <button
                type='button'
                onClick={send}
                disabled={status}
                className='group relative overflow-hidden bg-gradient-to-r from-blue-600 to-cyan-500 enabled:hover:scale-[1.01] enabled:active:scale-[0.99] transition-transform duration-200 text-white min-h-[48px] py-4 sm:py-5 rounded-2xl sm:rounded-3xl text-base sm:text-lg font-semibold shadow-[0_10px_40px_rgba(59,130,246,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06142b] disabled:opacity-70 disabled:cursor-not-allowed touch-manipulation'
              >

                <div className='absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition'></div>

                <span className='relative z-10 flex items-center justify-center gap-3'>
                  {status ? 'Sending…' : '🚀 Send Bulk Emails'}
                </span>

              </button>

            </div>

            {/* Right — illustration: compact on phones */}
            <div className='relative flex items-center justify-center lg:pb-0 max-h-[32vh] sm:max-h-[40vh] lg:max-h-none overflow-hidden lg:overflow-visible'>
              {/* Glow */}
              <div className='absolute w-[200px] h-[200px] sm:w-[320px] sm:h-[320px] bg-cyan-400/20 blur-3xl rounded-full pointer-events-none' />

              <div className='absolute top-2 right-2 sm:top-6 sm:right-4 bg-white/10 backdrop-blur-md border border-white/10 px-3 py-2 sm:px-5 sm:py-4 rounded-xl sm:rounded-2xl shadow-xl lg:hidden text-right'>
                <p className='text-white text-[10px] sm:text-xs font-medium'>Emails out</p>
                <p className='text-xl sm:text-2xl font-bold text-cyan-300'>12.4K</p>
              </div>

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
                className='relative z-10 w-full max-w-[16rem] sm:max-w-md lg:max-w-lg mx-auto object-contain object-bottom max-h-[28vh] sm:max-h-[38vh] lg:max-h-none drop-shadow-[0_25px_50px_rgba(0,0,0,0.45)]'
                decoding='async'
                loading='lazy'
              />

            </div>

          </div>

        </main>

      </div>
    )
  }

  export default App