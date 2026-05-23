import { createFileRoute } from '@tanstack/react-router'
import { motion } from 'motion/react'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <div>
      {/* Section 1: Header */}
      <section>
        <div className="p-8">
          <header className="pb-4 mb-6">
            <h1 className="flex items-center gap-4 text-2xl font-bold text-center">
              {/* TODO: When user presses Bond, takes back to home page/top of page. */}
              <motion.button 
                className="text-accent-amber"
                whileHover={{scale: 1.2}}
                whileTap={{scale: 0.85}}
              >
                Bond 
              </motion.button>

              <motion.div
                className="w-5 h-5 bg-amber-500 text-xs"
                animate={{
                    // scale: [1, 2, 2, 1, 1],
                    rotate: [0, 0, 180, 180, 0],
                    borderRadius: ["0%", "0%", "50%", "50%", "0%"],
                }}
                transition={{
                    duration: 2,
                    ease: "easeInOut",
                    times: [0, 0.2, 0.5, 0.8, 1],
                    repeat: Infinity,
                    repeatDelay: 1,
                }}
              >Insert Bond Logo</motion.div>
            </h1>
          </header>
        </div>
      

        {/* Action/Body Statement */}
        <div className="flex justify-center items-center">
          <div className="text-center mt-4 text-lg">
            <div className="text-6xl font-bold mb-6">
              <p className="text-gradient-bond">Find Your Bonding Language</p>
            </div>
            <p>Bond makes being with your friends easy and seamless, no matter the situation</p>

            <motion.button 
              whileHover={{scale: 1.1}}
              whileTap={{scale: 0.95}}
            >
              <button className="border-1 hover:bg-accent-coral rounded-4xl p-2 bg-accent-tangerine mt-6">
                Start Going Out
              </button>
            </motion.button>
          </div>
        </div>

        {/* Video */}
        <motion.div 
          initial={{ opacity: 0, scale: 0 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ duration: 0.4, ease: "easeOut"}}
        >
          <div className="flex justify-center items-center m-6">
            <video width="800px" controls autoPlay muted loop>
              <source src="../videos/bond_example.mp4" type="video/mp4" />
              <source src="../videos/bond_example.webm" type="video/webm" />
            </video>
          </div>
        </motion.div>

      </section>

      {/* Section 2: How does Bond Work? */}
      <section className="">
        <div className="flex justify-center items-center">
          <div className="text-center mt-4 text-lg w-full">
            <p>How Bond helps your friend group</p>
            <div className="flex justify-evenly items-center w-full gap-4 mt-6">
              <div className="border-2 rounded-2xl p-6 flex-1 text-center"> 
                <p>Create/Join your Crew</p>
              </div>
              <div className="border-2 rounded-2xl p-6 flex-1 text-center"> 
                <p>Bond will then curate a plan</p>
              </div>
              <div className="border-2 rounded-2xl p-6 flex-1 text-center"> 
                <p>All you have to do is just show up!</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Mission Statement */}
      <section className="">                  
        <div className="flex justify-center items-center">
          <div className="text-center mt-4 text-lg w-full">
            <p className="font-bold flex justify-evenly items-center w-full gap-4 m-6">Our mission</p>
            <p className="border-2 rounded-2xl p-6 flex-1 text-center">We created Bond because making plans with your friends shouldn't feel like a chore. Our goal is simple, to bring people together easily and seamless.</p>
          </div>
        </div>
      </section>

      {/* Section 4: Waitlist */}
      <section>
        <div className="flex justify-center items-center">
          <div className="text-center mt-4 text-lg w-full">
            <p>Get early access!</p>
          </div>
        </div>
      </section>
      
    </div>
  )
}
