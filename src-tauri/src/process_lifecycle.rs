//! Process lifecycle utilities for the desktop shell (outer adapter layer).
//! Ensures child processes spawned by Nxtrive are torn down when the app exits.

use std::process::Command;

#[cfg(windows)]
use std::sync::{Arc, Mutex};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

/// Shared supervisor that binds spawned children to the desktop app lifetime.
#[derive(Clone)]
pub struct ProcessSupervisor {
    #[cfg(windows)]
    child_job: Arc<Mutex<Option<ChildProcessJob>>>,
}

impl ProcessSupervisor {
    pub fn new() -> Self {
        #[cfg(windows)]
        {
            Self {
                child_job: Arc::new(Mutex::new(ChildProcessJob::new())),
            }
        }

        #[cfg(not(windows))]
        {
            Self {}
        }
    }

    pub fn assign_child(&self, pid: u32) {
        if pid == 0 {
            return;
        }

        #[cfg(windows)]
        if let Ok(mut guard) = self.child_job.lock() {
            if let Some(job) = guard.as_mut() {
                if !job.assign_pid(pid) {
                    eprintln!("Nxtrive backend: could not attach pid {pid} to lifecycle job");
                }
            }
        }

        #[cfg(not(windows))]
        let _ = pid;
    }
}

/// Keeps spawned backend processes in a Windows job that ends them with the app.
#[cfg(windows)]
struct ChildProcessJob {
    handle: isize,
}

#[cfg(windows)]
unsafe impl Send for ChildProcessJob {}

#[cfg(windows)]
unsafe impl Sync for ChildProcessJob {}

#[cfg(windows)]
impl ChildProcessJob {
    fn new() -> Option<Self> {
        use std::mem::zeroed;
        use windows_sys::Win32::Foundation::CloseHandle;
        use windows_sys::Win32::System::JobObjects::{
            CreateJobObjectW, JobObjectExtendedLimitInformation,
            JOBOBJECT_EXTENDED_LIMIT_INFORMATION, JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
            SetInformationJobObject,
        };

        unsafe {
            let handle = CreateJobObjectW(std::ptr::null(), std::ptr::null());
            if handle.is_null() {
                return None;
            }

            let mut info: JOBOBJECT_EXTENDED_LIMIT_INFORMATION = zeroed();
            info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;

            let configured = SetInformationJobObject(
                handle,
                JobObjectExtendedLimitInformation,
                &info as *const _ as *const _,
                std::mem::size_of::<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>() as u32,
            );

            if configured == 0 {
                CloseHandle(handle);
                return None;
            }

            Some(Self {
                handle: handle as isize,
            })
        }
    }

    fn assign_pid(&mut self, pid: u32) -> bool {
        use windows_sys::Win32::Foundation::CloseHandle;
        use windows_sys::Win32::System::JobObjects::AssignProcessToJobObject;
        use windows_sys::Win32::System::Threading::{OpenProcess, PROCESS_SET_QUOTA, PROCESS_TERMINATE};

        unsafe {
            let job = self.handle as windows_sys::Win32::Foundation::HANDLE;
            let process = OpenProcess(PROCESS_SET_QUOTA | PROCESS_TERMINATE, 0, pid);
            if process.is_null() {
                return false;
            }

            let assigned = AssignProcessToJobObject(job, process) != 0;
            CloseHandle(process);
            assigned
        }
    }
}

#[cfg(windows)]
impl Drop for ChildProcessJob {
    fn drop(&mut self) {
        use windows_sys::Win32::Foundation::CloseHandle;

        unsafe {
            CloseHandle(self.handle as windows_sys::Win32::Foundation::HANDLE);
        }
    }
}

/// Terminate a process and every descendant started by it.
pub fn kill_process_tree(pid: u32) {
    if pid == 0 {
        return;
    }

    #[cfg(windows)]
    {
        let _ = Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/T", "/F"])
            .creation_flags(CREATE_NO_WINDOW)
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .status();
    }

    #[cfg(unix)]
    {
        let _ = Command::new("pkill")
            .args(["-TERM", "-P", &pid.to_string()])
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .status();

        let _ = Command::new("kill")
            .args(["-TERM", &pid.to_string()])
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .status();
    }
}
