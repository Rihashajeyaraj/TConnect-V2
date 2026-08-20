import requests
import logging
from typing import Dict, Any, Optional
from app.core.config import settings

logger = logging.getLogger("TwiteConnect Backend")

class BiometricClient:
    def __init__(self):
        self.base_url = settings.BIOMETRIC_SERVICE_URL.rstrip("/")

    def check_health(self) -> Dict[str, Any]:
        """
        Check health/connectivity of the external biometric service.
        Returns a dict with connectivity details and service status.
        """
        url = f"{self.base_url}/health"
        timeout = 5.0  # reasonable timeout in seconds
        
        logger.info(f"Checking biometric service health at: {url}")
        try:
            response = requests.get(url, timeout=timeout)
            status_code = response.status_code
            
            if status_code == 200:
                try:
                    res_json = response.json()
                except Exception:
                    res_json = {"text": response.text[:500]}
                
                logger.info(f"Biometric service is healthy. Status: {status_code}")
                return {
                    "reachable": True,
                    "status_code": status_code,
                    "response": res_json
                }
            else:
                logger.warning(f"Biometric service returned non-200 status code: {status_code}")
                return {
                    "reachable": True,
                    "status_code": status_code,
                    "response": response.text[:500]
                }
                
        except requests.exceptions.Timeout as t_err:
            logger.error(f"Biometric service health check timed out: {t_err}")
            return {
                "reachable": False,
                "error": "Timeout",
                "message": str(t_err)
            }
        except requests.exceptions.ConnectionError as c_err:
            logger.error(f"Biometric service connection failed: {c_err}")
            return {
                "reachable": False,
                "error": "ConnectionError",
                "message": str(c_err)
            }
        except Exception as err:
            logger.error(f"Biometric service health check failed unexpectedly: {err}")
            return {
                "reachable": False,
                "error": "UnexpectedError",
                "message": str(err)
            }

    def extract_vectors(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Extract face template vector from image bytes by calling the biometric backend.
        """
        url = f"{self.base_url}/api/v1/extract-vectors"
        files = [("images", ("frame.png", image_bytes, "image/png"))]
        timeout = 10.0
        
        try:
            logger.info(f"Sending face image for vector extraction to: {url}")
            response = requests.post(url, files=files, timeout=timeout)
            status_code = response.status_code
            
            if status_code == 200:
                res_json = response.json()
                if res_json.get("success") and "face_encoding" in res_json:
                    return {
                        "success": True,
                        "face_encoding": res_json["face_encoding"]
                    }
                else:
                    return {
                        "success": False,
                        "error": "ExtractionError",
                        "message": res_json.get("message") or "Extraction succeeded but no encoding returned."
                    }
            elif status_code in (400, 422, 500):
                try:
                    detail = response.json().get("detail", "Error message not found")
                except Exception:
                    detail = response.text[:200]
                return {
                    "success": False,
                    "error": f"HTTP{status_code}",
                    "message": detail
                }
            else:
                return {
                    "success": False,
                    "error": f"HTTP{status_code}",
                    "message": response.text[:200]
                }
        except requests.exceptions.Timeout as t_err:
            logger.error(f"Extraction request timed out: {t_err}")
            return {
                "success": False,
                "error": "Timeout",
                "message": str(t_err)
            }
        except Exception as err:
            logger.error(f"Extraction request failed: {err}")
            return {
                "success": False,
                "error": "UnexpectedError",
                "message": str(err)
            }

    def match_face(self, image_bytes_list: list, candidate_list: str) -> Dict[str, Any]:
        """
        Call the biometric backend to match live face images against a list of candidates.
        """
        url = f"{self.base_url}/api/v1/match-face"
        
        # Build multipart files list
        files = []
        for idx, img_bytes in enumerate(image_bytes_list):
            files.append(("images", (f"frame_{idx}.png", img_bytes, "image/png")))
            
        data = {
            "candidate_list": candidate_list
        }
        timeout = 10.0
        
        try:
            logger.info(f"Sending face images for matching to: {url} with {len(files)} frames")
            response = requests.post(url, files=files, data=data, timeout=timeout)
            status_code = response.status_code
            
            # Write debug log
            try:
                with open("debug_match.log", "w", encoding="utf-8") as f:
                    f.write(f"URL: {url}\n")
                    f.write(f"Status Code: {status_code}\n")
                    f.write(f"Response: {response.text}\n")
                    f.write(f"Candidate List: {candidate_list}\n")
            except Exception as log_err:
                logger.error(f"Failed to write debug log: {log_err}")
            
            if status_code == 200:
                res_json = response.json()
                return {
                    "success": True,
                    "verified": res_json.get("verified", False),
                    "matched_id": res_json.get("matched_id"),
                    "similarity_score": res_json.get("similarity_score", 0.0),
                    "message": res_json.get("message", "")
                }
            elif status_code == 401:
                # 401 indicates unmatched/unrecognized face (not a system error)
                try:
                    detail = response.json().get("detail", "Face unrecognized")
                except Exception:
                    detail = response.text[:200]
                return {
                    "success": True,
                    "verified": False,
                    "matched_id": None,
                    "message": detail
                }
            else:
                try:
                    detail = response.json().get("detail", "Matching error")
                except Exception:
                    detail = response.text[:200]
                return {
                    "success": False,
                    "error": f"HTTP{status_code}",
                    "message": detail
                }
        except requests.exceptions.Timeout as t_err:
            logger.error(f"Matching request timed out: {t_err}")
            return {
                "success": False,
                "error": "Timeout",
                "message": str(t_err)
            }
        except Exception as err:
            logger.error(f"Matching request failed: {err}")
            return {
                "success": False,
                "error": "UnexpectedError",
                "message": str(err)
            }

